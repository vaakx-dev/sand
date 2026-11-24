package dev.vaakx.sand

import android.content.Context
import android.content.Intent
import android.provider.Settings
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import java.io.File
import java.net.InetAddress
import java.net.ServerSocket
import java.security.MessageDigest
import kotlin.concurrent.thread

private val APK_BYTES = ByteArray(200_000) { (it % 251).toByte() }
private val APK_SHA256 = MessageDigest.getInstance("SHA-256").digest(APK_BYTES).joinToString("") { "%02x".format(it) }

private fun answer(server: ServerSocket) = server.accept().use { client ->
    val request = client.getInputStream().bufferedReader()
    generateSequence(request::readLine).takeWhile { it.isNotEmpty() }.count()
    val head = "HTTP/1.1 200 OK\r\nContent-Length: ${APK_BYTES.size}\r\nConnection: close\r\n\r\n"
    client.getOutputStream().apply { write(head.toByteArray()); write(APK_BYTES); flush() }
}

@RunWith(RobolectricTestRunner::class)
class UpdateTest {
    private val context: Context = RuntimeEnvironment.getApplication()
    private val target = File(File(context.cacheDir, "update"), "sand.apk")

    private fun downloadServed(sha256: String, progress: (Float) -> Unit) = ServerSocket(0, 1, InetAddress.getLoopbackAddress()).use { server ->
        thread { answer(server) }
        download(Apk("http://127.0.0.1:${server.localPort}/sand.apk", sha256), target, progress)
    }

    @Test
    fun downloadsTheApkAndReportsProgressUpToTheWholeFile() {
        val told = mutableListOf<Float>()

        downloadServed(APK_SHA256, told::add)

        assertArrayEquals(APK_BYTES, target.readBytes())
        assertEquals(1f, told.last())
        assertEquals(told.sorted(), told)
    }

    @Test
    fun throwsAwayADownloadWhoseChecksumDoesNotMatch() {
        assertThrows(DamagedDownload::class.java) { downloadServed("0".repeat(64)) {} }
        assertFalse(target.exists())
    }

    @Test
    fun sendsTheUserToAllowInstallsUntilTheyAreAllowed() {
        shadowOf(context.packageManager).setCanRequestPackageInstalls(false)
        val settings = installPermission(context)!!
        assertEquals(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, settings.action)
        assertEquals("package:${context.packageName}", settings.dataString)

        shadowOf(context.packageManager).setCanRequestPackageInstalls(true)
        assertNull(installPermission(context))
    }

    @Test
    fun opensTheInstallerOnAContentUriItMayRead() {
        val intent = installer(context, target)

        assertEquals(Intent.ACTION_VIEW, intent.action)
        assertEquals("application/vnd.android.package-archive", intent.type)
        assertEquals("content", intent.data?.scheme)
        assertEquals("${context.packageName}.files", intent.data?.authority)
        assertTrue(intent.flags and Intent.FLAG_GRANT_READ_URI_PERMISSION != 0)
    }
}

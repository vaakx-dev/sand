package dev.vaakx.sand

import android.content.Context
import android.content.Intent
import android.provider.Settings
import androidx.core.content.FileProvider
import androidx.core.net.toUri
import java.io.File
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.DigestInputStream
import java.security.MessageDigest
import java.util.concurrent.Executors

private const val APK_TYPE = "application/vnd.android.package-archive"
private const val UPDATE_FOLDER = "update"
private const val APK_FILE = "sand.apk"
private const val CONNECT_TIMEOUT_MS = 10_000
private const val READ_TIMEOUT_MS = 30_000
private const val BUFFER_BYTES = 64 * 1024

data class Apk(val url: String, val sha256: String?)

class DamagedDownload : IOException("the download does not match the release")

private fun hex(bytes: ByteArray) = bytes.joinToString("") { "%02x".format(it) }

private fun copy(input: InputStream, output: OutputStream, totalBytes: Long, progress: (Float) -> Unit) {
    val buffer = ByteArray(BUFFER_BYTES)
    var copiedBytes = 0L
    var toldPercent = -1
    while (true) {
        val read = input.read(buffer)
        if (read < 0) return
        output.write(buffer, 0, read)
        copiedBytes += read
        val percent = if (totalBytes > 0) (copiedBytes * 100 / totalBytes).toInt() else toldPercent
        if (percent == toldPercent) continue
        toldPercent = percent
        progress(percent / 100f)
    }
}

private fun opened(url: String): HttpURLConnection {
    val connection = URL(url).openConnection() as HttpURLConnection
    connection.connectTimeout = CONNECT_TIMEOUT_MS
    connection.readTimeout = READ_TIMEOUT_MS
    if (connection.responseCode != HttpURLConnection.HTTP_OK) throw IOException("HTTP ${connection.responseCode}")
    return connection
}

fun download(apk: Apk, to: File, progress: (Float) -> Unit) {
    val connection = opened(apk.url)
    val digest = MessageDigest.getInstance("SHA-256")
    to.parentFile?.mkdirs()
    DigestInputStream(connection.inputStream, digest).use { input -> to.outputStream().use { output -> copy(input, output, connection.contentLengthLong, progress) } }
    if (apk.sha256 == null || hex(digest.digest()) == apk.sha256) return
    to.delete()
    throw DamagedDownload()
}

fun installPermission(context: Context): Intent? {
    if (context.packageManager.canRequestPackageInstalls()) return null
    return Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, "package:${context.packageName}".toUri())
}

fun installer(context: Context, apk: File): Intent {
    val uri = FileProvider.getUriForFile(context, "${context.packageName}.files", apk)
    return Intent(Intent.ACTION_VIEW).setDataAndType(uri, APK_TYPE).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
}

object Update {
    private val worker = Executors.newSingleThreadExecutor()

    fun start(context: Context, apk: Apk) {
        val app = context.applicationContext
        worker.execute { install(app, apk) }
    }

    private fun install(context: Context, apk: Apk) {
        val file = File(File(context.cacheDir, UPDATE_FOLDER), APK_FILE)
        try {
            download(apk, file, Page::installProgress)
        } catch (error: DamagedDownload) {
            return Page.installFailed(context.getString(R.string.update_damaged))
        } catch (error: IOException) {
            return Page.installFailed(context.getString(R.string.update_download_failed, error.message ?: error.javaClass.simpleName))
        }
        context.startActivity(installer(context, file))
        Page.installOpened()
    }
}

package dev.vaakx.sand

import android.content.ContentProvider
import android.content.ContentValues
import android.content.Intent
import android.database.MatrixCursor
import android.net.Uri
import android.os.ParcelFileDescriptor
import android.provider.OpenableColumns
import android.webkit.WebResourceRequest
import org.json.JSONObject
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import java.io.File

private const val WAIT_MS = 5_000L
private const val GALLERY = "com.example.gallery"

class Gallery : ContentProvider() {
    val pictures = mutableMapOf<String, File>()

    private fun pictureAt(uri: Uri) = pictures.getValue(uri.lastPathSegment!!)

    override fun onCreate() = true
    override fun getType(uri: Uri) = "image/png"
    override fun query(uri: Uri, projection: Array<String>?, selection: String?, selectionArgs: Array<String>?, sortOrder: String?) =
        MatrixCursor(arrayOf(OpenableColumns.DISPLAY_NAME)).apply { addRow(arrayOf(pictureAt(uri).name)) }
    override fun openFile(uri: Uri, mode: String): ParcelFileDescriptor = ParcelFileDescriptor.open(pictureAt(uri), ParcelFileDescriptor.MODE_READ_ONLY)
    override fun insert(uri: Uri, values: ContentValues?) = null
    override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<String>?) = 0
    override fun delete(uri: Uri, selection: String?, selectionArgs: Array<String>?) = 0
}

private fun pageGet(path: String) = object : WebResourceRequest {
    override fun getUrl(): Uri = Uri.parse(PAGE_ORIGIN + path)
    override fun isForMainFrame() = false
    override fun isRedirect() = false
    override fun hasGesture() = false
    override fun getMethod() = "GET"
    override fun getRequestHeaders() = emptyMap<String, String>()
}

private fun taken(): JSONObject {
    val until = System.currentTimeMillis() + WAIT_MS
    while (System.currentTimeMillis() < until) Shares.take()?.let { return it } ?: Thread.sleep(10)
    throw AssertionError("the share was never staged")
}

@RunWith(RobolectricTestRunner::class)
class ShareTest {
    @get:Rule val folder = TemporaryFolder()
    private val app = RuntimeEnvironment.getApplication()

    private val gallery = Robolectric.buildContentProvider(Gallery::class.java).create(GALLERY).get()

    private fun pictureOf(id: String, name: String, bytes: ByteArray): Uri {
        gallery.pictures[id] = folder.newFile(name).apply { writeBytes(bytes) }
        return Uri.parse("content://$GALLERY/images/$id")
    }

    @Test
    fun aLinkFromTheBrowserArrivesAsItsTitleAndAddress() {
        val intent = Intent(Intent.ACTION_SEND)
            .setType("text/plain")
            .putExtra(Intent.EXTRA_SUBJECT, "Retry with exponential backoff")
            .putExtra(Intent.EXTRA_TEXT, "https://docs.example.dev/guides/retries")

        val message = staged(app.contentResolver, folder.newFolder("staged"), incomingOf(intent)!!).message()

        assertEquals("Retry with exponential backoff\n\nhttps://docs.example.dev/guides/retries", message.getString("text"))
        assertEquals(0, message.getJSONArray("files").length())
    }

    @Test
    fun everySharedFileIsKeptForThePageOnceEvenAfterTheSenderDropsIt() {
        val tide = byteArrayOf(1, 2, 3)
        val reef = byteArrayOf(4, 5)
        val streams = arrayListOf(pictureOf("101", "tide.png", tide), pictureOf("102", "reef.png", reef))
        val intent = Intent(Intent.ACTION_SEND_MULTIPLE).setType("image/*").putParcelableArrayListExtra(Intent.EXTRA_STREAM, streams)

        Shares.receive(app, incomingOf(intent)!!)
        val files = taken().getJSONArray("files")
        gallery.pictures.values.forEach(File::delete)
        val proxy = Proxy(Pc(app), app.assets)
        val served = List(files.length()) { files.getJSONObject(it) }.map { file ->
            val response = proxy.response(pageGet(file.getString("url")))!!
            Triple(file.getString("name"), response.mimeType, response.data.readBytes().toList())
        }

        assertEquals(listOf(Triple("tide.png", "image/png", tide.toList()), Triple("reef.png", "image/png", reef.toList())), served)
        assertNull(Shares.take())
    }

    @Test
    fun opensThatShareNothingAreNotShares() {
        val launch = Intent(Intent.ACTION_MAIN)
        val empty = Intent(Intent.ACTION_SEND).setType("text/plain")
        val fromRecents = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, "Water the roses").addFlags(Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY)

        assertArrayEquals(arrayOf(null, null, null), arrayOf(launch, empty, fromRecents).map(::incomingOf).toTypedArray())
    }
}

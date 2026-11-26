package dev.vaakx.sand

import android.content.ContentResolver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import androidx.core.content.IntentCompat
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.IOException
import java.util.UUID
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

private const val SHARED_FOLDER = "shared"
private const val ANY_TYPE = "application/octet-stream"
private val SHARE_ACTIONS = setOf(Intent.ACTION_SEND, Intent.ACTION_SEND_MULTIPLE)

const val SHARED_PATH = "/~app/shared/"

class Incoming(val text: String, val files: List<Uri>, val type: String?)

class Staged(val name: String, val type: String, val file: File)

class Share(val text: String, val files: Map<String, Staged>) {
    fun message(): JSONObject {
        val listed = files.map { (id, staged) -> JSONObject().put("url", SHARED_PATH + id).put("name", staged.name).put("type", staged.type) }
        return JSONObject().put("kind", "share").put("text", text).put("files", JSONArray(listed))
    }
}

private fun streamsOf(intent: Intent): List<Uri> = when (intent.action) {
    Intent.ACTION_SEND -> listOfNotNull(IntentCompat.getParcelableExtra(intent, Intent.EXTRA_STREAM, Uri::class.java))
    else -> IntentCompat.getParcelableArrayListExtra(intent, Intent.EXTRA_STREAM, Uri::class.java).orEmpty()
}

private fun textOf(intent: Intent) =
    listOfNotNull(intent.getStringExtra(Intent.EXTRA_SUBJECT), intent.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString())
        .map(String::trim)
        .filter(String::isNotEmpty)
        .distinct()
        .joinToString("\n\n")

private fun replayed(intent: Intent) = intent.flags and Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY != 0

fun incomingOf(intent: Intent): Incoming? {
    if (intent.action !in SHARE_ACTIONS || replayed(intent)) return null
    val incoming = Incoming(textOf(intent), streamsOf(intent), intent.type)
    return incoming.takeIf { it.text.isNotEmpty() || it.files.isNotEmpty() }
}

private fun nameOf(resolver: ContentResolver, uri: Uri) =
    resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { row -> if (row.moveToFirst()) row.getString(0) else null }
        ?: uri.lastPathSegment
        ?: SHARED_FOLDER

private fun typeOf(resolver: ContentResolver, uri: Uri, shared: String?) =
    resolver.getType(uri) ?: shared?.takeUnless { it.endsWith("/*") } ?: ANY_TYPE

private fun copied(resolver: ContentResolver, folder: File, uri: Uri, shared: String?): Pair<String, Staged>? {
    val id = UUID.randomUUID().toString()
    val file = File(folder, id)
    return try {
        val input = resolver.openInputStream(uri) ?: return null
        input.use { source -> file.outputStream().use { source.copyTo(it) } }
        id to Staged(nameOf(resolver, uri), typeOf(resolver, uri, shared), file)
    } catch (error: IOException) {
        null
    } catch (error: SecurityException) {
        null
    }
}

fun staged(resolver: ContentResolver, folder: File, incoming: Incoming): Share {
    folder.deleteRecursively()
    folder.mkdirs()
    return Share(incoming.text, incoming.files.mapNotNull { copied(resolver, folder, it, incoming.type) }.toMap())
}

object Shares {
    private val worker = Executors.newSingleThreadExecutor()
    private val unsent = AtomicBoolean(false)
    @Volatile private var current: Share? = null

    fun receive(context: Context, incoming: Incoming) {
        val resolver = context.contentResolver
        val folder = File(context.cacheDir, SHARED_FOLDER)
        worker.execute { keep(staged(resolver, folder, incoming)) }
    }

    fun take(): JSONObject? = current?.takeIf { unsent.getAndSet(false) }?.message()

    fun file(id: String) = current?.files?.get(id)

    private fun keep(share: Share) {
        current = share
        unsent.set(true)
        Page.shareWaiting()
    }
}

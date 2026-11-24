package dev.vaakx.sand

import org.json.JSONException
import org.json.JSONObject
import java.io.BufferedReader
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

private const val INBOX_PATH = "/notify/inbox"
private const val CONNECT_TIMEOUT_MS = 5_000
private const val READ_TIMEOUT_MS = 75_000
private const val ID_FIELD = "id: "
private const val DATA_FIELD = "data: "

enum class Ending {
    UNREACHABLE,
    DROPPED,
    REFUSED,
}

class Heard(val id: String, val notice: JSONObject)

private fun eventsOf(reader: BufferedReader, heard: (Heard) -> Unit) {
    var id = ""
    val data = StringBuilder()
    for (line in generateSequence(reader::readLine)) {
        when {
            line.startsWith(ID_FIELD) -> id = line.removePrefix(ID_FIELD)
            line.startsWith(DATA_FIELD) -> data.append(line.removePrefix(DATA_FIELD))
            line.isEmpty() && data.isNotEmpty() -> {
                heard(Heard(id, JSONObject(data.toString())))
                data.clear()
            }
        }
    }
}

class Inbox(private val pc: Pc, private val token: String) {
    @Volatile private var open: HttpURLConnection? = null

    fun listen(seen: String?, heard: (Heard) -> Unit, connected: () -> Unit): Ending {
        val route = pc.serving() ?: return Ending.UNREACHABLE
        val ending = stream(connect(route, seen), heard, connected)
        if (ending == Ending.DROPPED) pc.forget()
        return ending
    }

    fun drop() {
        open?.disconnect()
    }

    private fun connect(route: String, seen: String?) = (URL(route + INBOX_PATH).openConnection() as HttpURLConnection).apply {
        connectTimeout = CONNECT_TIMEOUT_MS
        readTimeout = READ_TIMEOUT_MS
        setRequestProperty("Authorization", "Bearer $token")
        setRequestProperty("Accept", "text/event-stream")
        seen?.let { setRequestProperty("Last-Event-ID", it) }
    }

    private fun stream(connection: HttpURLConnection, heard: (Heard) -> Unit, connected: () -> Unit): Ending {
        open = connection
        return try {
            endingOf(connection, heard, connected)
        } catch (error: IOException) {
            Ending.DROPPED
        } catch (error: JSONException) {
            Ending.DROPPED
        } finally {
            open = null
            connection.disconnect()
        }
    }

    private fun endingOf(connection: HttpURLConnection, heard: (Heard) -> Unit, connected: () -> Unit) = when (connection.responseCode) {
        HttpURLConnection.HTTP_OK -> {
            connected()
            connection.inputStream.bufferedReader().use { eventsOf(it, heard) }
            Ending.DROPPED
        }
        HttpURLConnection.HTTP_UNAUTHORIZED -> Ending.REFUSED
        else -> Ending.DROPPED
    }
}

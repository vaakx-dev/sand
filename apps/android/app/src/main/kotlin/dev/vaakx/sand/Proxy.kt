package dev.vaakx.sand

import android.content.res.AssetManager
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import java.io.ByteArrayInputStream
import java.io.FileNotFoundException
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

private const val CONNECT_TIMEOUT_MS = 4_000
private const val READ_TIMEOUT_MS = 60_000
private const val SETUP_FILE = "setup.html"
private const val SETUP_PATH = "/~app/$SETUP_FILE"
private const val STATE_SLOT = "{{state}}"
private val DROPPED_HEADERS = setOf("content-encoding", "content-length", "transfer-encoding", "connection")
private val NO_STORE = mapOf("cache-control" to "no-store")
private val CHARSET = Regex("charset=([^;\\s]+)", RegexOption.IGNORE_CASE)

private fun header(request: WebResourceRequest, name: String) =
    request.requestHeaders.entries.firstOrNull { it.key.equals(name, ignoreCase = true) }?.value

private fun opensPage(request: WebResourceRequest) = request.isForMainFrame || header(request, "sec-fetch-dest") == "document"

private fun reason(status: Int, message: String?) = message?.takeIf { it.isNotBlank() } ?: if (status < 400) "OK" else "Error"

private fun responseOf(connection: HttpURLConnection): WebResourceResponse {
    val status = connection.responseCode
    val body = (if (status < 400) connection.inputStream else connection.errorStream) ?: ByteArrayInputStream(ByteArray(0))
    val type = connection.contentType ?: "application/octet-stream"
    val headers = connection.headerFields
        .filterKeys { name -> name != null && name.lowercase() !in DROPPED_HEADERS }
        .mapValues { (_, values) -> values.joinToString(", ") }
    return WebResourceResponse(type.substringBefore(';').trim(), CHARSET.find(type)?.groupValues?.get(1), status, reason(status, connection.responseMessage), headers, body)
}

private fun fetch(route: String, path: String, headers: Map<String, String>): WebResourceResponse? = try {
    val connection = URL(route + path).openConnection() as HttpURLConnection
    connection.connectTimeout = CONNECT_TIMEOUT_MS
    connection.readTimeout = READ_TIMEOUT_MS
    headers.filterKeys { !it.equals("accept-encoding", ignoreCase = true) }.forEach(connection::setRequestProperty)
    responseOf(connection)
} catch (error: IOException) {
    null
}

private enum class Setup(val status: Int) {
    PAIR(200),
    UNREACHABLE(503),
    OUTDATED(426),
}

class Proxy(private val pc: Pc, private val assets: AssetManager) {
    private val setupPage by lazy { assets.open(SETUP_FILE).bufferedReader().use { it.readText() } }

    fun response(request: WebResourceRequest): WebResourceResponse? {
        val url = request.url
        if (url.scheme != "https" || url.host != PAGE_HOST || request.method != "GET") return null
        val path = url.encodedPath ?: "/"
        if (path == SETUP_PATH) return setup(Setup.PAIR)
        if (path.startsWith(SHARED_PATH)) return sharedFile(path.removePrefix(SHARED_PATH))
        if (outdatedPage(request)) return setup(Setup.OUTDATED)
        val target = path + (url.encodedQuery?.let { "?$it" } ?: "")
        return fromPc(target, request.requestHeaders) ?: unreachable(request)
    }

    private fun outdatedPage(request: WebResourceRequest) = opensPage(request) && pc.serving() != null && pc.outdated

    private fun fromPc(path: String, headers: Map<String, String>): WebResourceResponse? {
        val first = pc.serving() ?: return null
        fetch(first, path, headers)?.let { return it }
        pc.forget()
        return pc.serving()?.let { fetch(it, path, headers) }
    }

    private fun unreachable(request: WebResourceRequest) =
        if (opensPage(request)) setup(Setup.UNREACHABLE) else WebResourceResponse("text/plain", "utf-8", Setup.UNREACHABLE.status, "Unreachable", emptyMap(), ByteArrayInputStream(ByteArray(0)))

    private fun sharedFile(id: String): WebResourceResponse {
        val staged = Shares.file(id) ?: return missing()
        return try {
            WebResourceResponse(staged.type, null, 200, "OK", NO_STORE, staged.file.inputStream())
        } catch (error: FileNotFoundException) {
            missing()
        }
    }

    private fun missing() = WebResourceResponse("text/plain", "utf-8", 404, "Not Found", NO_STORE, ByteArrayInputStream(ByteArray(0)))

    private fun setup(state: Setup): WebResourceResponse {
        val page = setupPage.replace(STATE_SLOT, state.name.lowercase()).toByteArray()
        return WebResourceResponse("text/html", "utf-8", state.status, reason(state.status, null), NO_STORE, ByteArrayInputStream(page))
    }
}

const val PAGE_HOST = "sand.localhost"
const val PAGE_ORIGIN = "https://$PAGE_HOST"
const val SETUP_URL = "$PAGE_ORIGIN$SETUP_PATH"

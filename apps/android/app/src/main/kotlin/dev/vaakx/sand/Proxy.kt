package dev.vaakx.sand

import android.content.res.AssetManager
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import java.io.ByteArrayInputStream
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

private const val CONNECT_TIMEOUT_MS = 4_000
private const val READ_TIMEOUT_MS = 60_000
private const val SETUP_FILE = "setup.html"
private const val SETUP_PATH = "/~app/$SETUP_FILE"
private const val UNREACHABLE = 503
private val DROPPED_HEADERS = setOf("content-encoding", "content-length", "transfer-encoding", "connection")
private val CHARSET = Regex("charset=([^;\\s]+)", RegexOption.IGNORE_CASE)

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

class Proxy(private val pc: Pc, private val assets: AssetManager) {
    fun response(request: WebResourceRequest): WebResourceResponse? {
        val url = request.url
        if (url.scheme != "https" || url.host != PAGE_HOST || request.method != "GET") return null
        val path = url.encodedPath ?: "/"
        if (path == SETUP_PATH) return setup(200)
        val target = path + (url.encodedQuery?.let { "?$it" } ?: "")
        return fromPc(target, request.requestHeaders) ?: unreachable(request)
    }

    private fun fromPc(path: String, headers: Map<String, String>): WebResourceResponse? {
        val first = pc.serving() ?: return null
        fetch(first, path, headers)?.let { return it }
        pc.forget()
        return pc.serving()?.let { fetch(it, path, headers) }
    }

    private fun unreachable(request: WebResourceRequest) =
        if (request.isForMainFrame) setup(UNREACHABLE) else WebResourceResponse("text/plain", "utf-8", UNREACHABLE, "Unreachable", emptyMap(), ByteArrayInputStream(ByteArray(0)))

    private fun setup(status: Int) =
        WebResourceResponse("text/html", "utf-8", status, reason(status, null), mapOf("cache-control" to "no-store"), assets.open(SETUP_FILE))
}

const val PAGE_HOST = "sand.localhost"
const val PAGE_ORIGIN = "https://$PAGE_HOST"
const val SETUP_URL = "$PAGE_ORIGIN$SETUP_PATH"

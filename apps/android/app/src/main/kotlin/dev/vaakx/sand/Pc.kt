package dev.vaakx.sand

import android.content.Context
import android.util.Base64
import androidx.core.content.edit
import com.google.crypto.tink.subtle.Ed25519Verify
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.security.GeneralSecurityException
import java.security.SecureRandom

private const val ROUTES = "routes"
private const val KEY = "key"
private const val PROBE_TIMEOUT_MS = 2_500
private const val NONCE_BYTES = 18
private const val APP_PROTOCOL = 2

private fun decode(text: String) = Base64.decode(text, Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP)

private fun newNonce(): String {
    val bytes = ByteArray(NONCE_BYTES).also(SecureRandom()::nextBytes)
    return Base64.encodeToString(bytes, Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP)
}

private fun identityProof(clientNonce: String, reply: JSONObject) =
    listOf("sand-identity", clientNonce, reply.getString("nonce"), reply.getString("id")).joinToString("\n")

private fun signed(reply: JSONObject, clientNonce: String) = try {
    Ed25519Verify(decode(reply.getString("publicKey"))).verify(decode(reply.getString("signature")), identityProof(clientNonce, reply).toByteArray())
    true
} catch (error: GeneralSecurityException) {
    false
}

private fun identity(route: String, clientNonce: String): JSONObject? = try {
    val connection = URL("$route/identity?nonce=$clientNonce").openConnection() as HttpURLConnection
    connection.connectTimeout = PROBE_TIMEOUT_MS
    connection.readTimeout = PROBE_TIMEOUT_MS
    if (connection.responseCode == HttpURLConnection.HTTP_OK) JSONObject(connection.inputStream.bufferedReader().readText()) else null
} catch (error: Exception) {
    null
}

class Pc(context: Context) {
    private val prefs = context.getSharedPreferences("pc", Context.MODE_PRIVATE)
    @Volatile private var serving: String? = null
    @Volatile var outdated = false
        private set

    fun routes(): List<String> {
        val saved = JSONArray(prefs.getString(ROUTES, "[]"))
        return List(saved.length(), saved::getString)
    }

    fun paired() = routes().isNotEmpty()

    fun pair(route: String) {
        prefs.edit { putString(ROUTES, JSONArray(listOf(route)).toString()).remove(KEY) }
        serving = null
    }

    fun follow(routes: List<String>) {
        prefs.edit { putString(ROUTES, JSONArray(routes).toString()) }
        if (serving != routes.first()) serving = null
    }

    fun forget() {
        serving = null
    }

    @Synchronized
    fun serving(): String? = serving ?: routes().firstOrNull(::proves)?.also { serving = it }

    private fun proves(route: String): Boolean {
        val clientNonce = newNonce()
        val reply = identity(route, clientNonce) ?: return false
        val key = reply.optString("publicKey")
        val pinned = prefs.getString(KEY, null)
        if (pinned != null && pinned != key) return false
        if (!signed(reply, clientNonce)) return false
        if (pinned == null) prefs.edit { putString(KEY, key) }
        outdated = reply.optInt("appProtocol") < APP_PROTOCOL
        return true
    }
}

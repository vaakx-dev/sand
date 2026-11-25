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

private class Identity(val id: String, val nonce: String, val publicKey: String, val signature: String, val appProtocol: Int)

private class Proof(val outdated: Boolean)

private fun identityProof(clientNonce: String, identity: Identity) =
    listOf("sand-identity", clientNonce, identity.nonce, identity.id).joinToString("\n")

private fun signed(identity: Identity, clientNonce: String) = try {
    Ed25519Verify(decode(identity.publicKey)).verify(decode(identity.signature), identityProof(clientNonce, identity).toByteArray())
    true
} catch (error: GeneralSecurityException) {
    false
}

private fun identityOf(reply: JSONObject) =
    Identity(reply.getString("id"), reply.getString("nonce"), reply.getString("publicKey"), reply.getString("signature"), reply.optInt("appProtocol"))

private fun identity(route: String, clientNonce: String): Identity? = try {
    val connection = URL("$route/identity?nonce=$clientNonce").openConnection() as HttpURLConnection
    connection.connectTimeout = PROBE_TIMEOUT_MS
    connection.readTimeout = PROBE_TIMEOUT_MS
    if (connection.responseCode == HttpURLConnection.HTTP_OK) identityOf(JSONObject(connection.inputStream.bufferedReader().readText())) else null
} catch (error: Exception) {
    null
}

class Pc(context: Context) {
    private val prefs = context.getSharedPreferences("pc", Context.MODE_PRIVATE)
    private val reach = Reach(::proof)

    val outdated get() = reach.current()?.proof?.outdated == true

    fun routes(): List<String> {
        val saved = JSONArray(prefs.getString(ROUTES, "[]"))
        return List(saved.length(), saved::getString)
    }

    fun paired() = routes().isNotEmpty()

    fun pair(route: String) {
        prefs.edit { putString(ROUTES, JSONArray(listOf(route)).toString()).remove(KEY) }
        reach.forget()
    }

    fun follow(routes: List<String>) {
        prefs.edit { putString(ROUTES, JSONArray(routes).toString()) }
        if (reach.current()?.route != routes.first()) reach.forget()
    }

    fun forget() = reach.forget()

    fun serving(): String? = reach.found(routes())?.route

    private fun proof(route: String): Proof? {
        val clientNonce = newNonce()
        val claimed = identity(route, clientNonce) ?: return null
        if (!signed(claimed, clientNonce) || !trusts(claimed.publicKey)) return null
        return Proof(outdated = claimed.appProtocol < APP_PROTOCOL)
    }

    @Synchronized
    private fun trusts(key: String): Boolean {
        val pinned = prefs.getString(KEY, null)
        if (pinned == null) prefs.edit { putString(KEY, key) }
        return pinned == null || pinned == key
    }
}

package dev.vaakx.sand

import android.os.Handler
import android.os.Looper
import androidx.webkit.JavaScriptReplyProxy
import org.json.JSONObject

object Page {
    private val main = Handler(Looper.getMainLooper())
    @Volatile private var reply: JavaScriptReplyProxy? = null
    @Volatile var visible = false

    fun heard(proxy: JavaScriptReplyProxy) {
        reply = proxy
    }

    fun send(message: JSONObject) {
        main.post { reply?.postMessage(message.toString()) }
    }

    fun networkChanged() = send(JSONObject().put("kind", "network"))

    fun pushFailed(reason: String) = send(JSONObject().put("kind", "push-failed").put("reason", reason))

    fun pushTarget(endpoint: String, p256dh: String, auth: String) = send(
        JSONObject().put("kind", "push").put(
            "target",
            JSONObject().put("endpoint", endpoint).put("keys", JSONObject().put("p256dh", p256dh).put("auth", auth)),
        ),
    )
}

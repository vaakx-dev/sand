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

    fun noticesAllowed() = send(JSONObject().put("kind", "notices-allowed"))

    fun noticesRefused(reason: String) = send(JSONObject().put("kind", "notices-refused").put("reason", reason))

    fun installProgress(fraction: Float) = send(JSONObject().put("kind", "install-progress").put("fraction", fraction.toDouble()))

    fun installFailed(reason: String) = send(JSONObject().put("kind", "install-failed").put("reason", reason))

    fun installOpened() = send(JSONObject().put("kind", "install-opened"))

    fun shareWaiting() = send(JSONObject().put("kind", "share-waiting"))
}

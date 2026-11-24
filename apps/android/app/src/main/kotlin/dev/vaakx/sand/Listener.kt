package dev.vaakx.sand

import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.ConnectivityManager
import android.net.Network
import android.os.PowerManager
import androidx.core.app.ServiceCompat
import kotlin.concurrent.thread

private const val FIRST_WAIT_MS = 2_000L
private const val LONGEST_WAIT_MS = 120_000L
private const val ATTEMPT_HOLD_MS = 30_000L
private const val WAKE_TAG = "sand:listener"

class Listener : Service() {
    private lateinit var pc: Pc
    private lateinit var wakeLock: PowerManager.WakeLock
    private val pause = Object()
    @Volatile private var running = true
    @Volatile private var inbox: Inbox? = null
    private var loop: Thread? = null
    private var defaultNetwork: Network? = null

    private val network = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            val previous = defaultNetwork
            defaultNetwork = network
            if (previous != null && previous != network) redial()
        }
    }

    override fun onBind(intent: Intent?) = null

    override fun onCreate() {
        super.onCreate()
        pc = Pc(this)
        wakeLock = getSystemService(PowerManager::class.java).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, WAKE_TAG).apply { setReferenceCounted(false) }
        getSystemService(ConnectivityManager::class.java).registerDefaultNetworkCallback(network)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (Notices.token(this) == null || !foreground()) return stopped()
        if (loop == null) loop = thread(name = WAKE_TAG) { listen() } else redial()
        return START_STICKY
    }

    override fun onDestroy() {
        running = false
        getSystemService(ConnectivityManager::class.java).unregisterNetworkCallback(network)
        redial()
        wakeLock.release()
        super.onDestroy()
    }

    private fun foreground() = try {
        ServiceCompat.startForeground(this, CONNECTION_NOTICE, connectionNotice(this, R.string.reaching), ServiceInfo.FOREGROUND_SERVICE_TYPE_REMOTE_MESSAGING)
        true
    } catch (error: IllegalStateException) {
        false
    }

    private fun stopped(): Int {
        stopSelf()
        return START_NOT_STICKY
    }

    private fun redial() {
        pc.forget()
        inbox?.drop()
        synchronized(pause) { pause.notifyAll() }
    }

    private fun heard(heard: Heard) {
        if (!Page.visible) show(this, heard.notice)
        Notices.saw(this, heard.id)
    }

    private fun connected() {
        wakeLock.release()
        showConnection(this, R.string.listening)
    }

    private fun listen() {
        var waitMs = FIRST_WAIT_MS
        while (running) {
            val token = Notices.token(this) ?: break
            val attempt = Inbox(pc, token).also { inbox = it }
            wakeLock.acquire(ATTEMPT_HOLD_MS)
            val ending = attempt.listen(Notices.seen(this), ::heard) {
                waitMs = FIRST_WAIT_MS
                connected()
            }
            wakeLock.release()
            showConnection(this, R.string.reaching)
            if (ending == Ending.REFUSED) Notices.refused(this, token)
            else synchronized(pause) { if (running) pause.wait(waitMs) }
            waitMs = minOf(waitMs * 2, LONGEST_WAIT_MS)
        }
        if (running) stopSelf()
    }
}

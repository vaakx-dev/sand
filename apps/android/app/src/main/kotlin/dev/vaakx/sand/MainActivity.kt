package dev.vaakx.sand

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.net.ConnectivityManager
import android.net.Network
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.activity.addCallback
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.pm.PackageInfoCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.JavaScriptReplyProxy
import androidx.webkit.ScriptHandler
import androidx.webkit.ServiceWorkerClientCompat
import androidx.webkit.ServiceWorkerControllerCompat
import androidx.webkit.WebMessageCompat
import androidx.webkit.WebViewCompat
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning
import org.json.JSONArray
import org.json.JSONObject

private const val BRIDGE = "sandApp"
private val PAGE_ORIGINS = setOf(PAGE_ORIGIN)

private fun routeOf(link: Uri) = "${link.scheme}://${link.encodedAuthority}"

private fun tokenOf(link: Uri) = link.encodedFragment?.split('&')?.firstNotNullOfOrNull { part -> part.removePrefix("pair=").takeIf { it != part } }

private fun stringsOf(array: JSONArray) = List(array.length(), array::getString)

class MainActivity : ComponentActivity() {
    private lateinit var pc: Pc
    private lateinit var proxy: Proxy
    private lateinit var web: WebView
    private var start: ScriptHandler? = null
    private var chosen: ValueCallback<Array<Uri>>? = null
    private var wantedApk: Apk? = null

    private val pickFiles = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        chosen?.onReceiveValue(chosenFiles(result.resultCode, result.data))
        chosen = null
    }

    private val askToNotify = registerForActivityResult(ActivityResultContracts.RequestPermission()) { answerNotices() }

    private val allowInstalls = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) {
        val apk = wantedApk ?: return@registerForActivityResult
        if (installPermission(this) == null) Update.start(this, apk) else Page.installFailed(getString(R.string.installs_off))
    }

    private val network = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) = networkChanged()
        override fun onLost(network: Network) = networkChanged()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        pc = Pc(this)
        proxy = Proxy(pc, assets)
        web = pageView()
        setContentView(insetFrame(web))
        WebViewCompat.addWebMessageListener(web, BRIDGE, PAGE_ORIGINS, ::heard)
        ServiceWorkerControllerCompat.getInstance().setServiceWorkerClient(object : ServiceWorkerClientCompat() {
            override fun shouldInterceptRequest(request: WebResourceRequest) = proxy.response(request)
        })
        getSystemService(ConnectivityManager::class.java).registerDefaultNetworkCallback(network)
        onBackPressedDispatcher.addCallback(this) { if (web.canGoBack()) web.goBack() else finish() }
        open(intent.getStringExtra(EXTRA_PATH) ?: "/")
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        intent.getStringExtra(EXTRA_PATH)?.let(::open)
    }

    override fun onResume() {
        super.onResume()
        Page.visible = true
        Notices.resume(this)
    }

    override fun onPause() {
        Page.visible = false
        super.onPause()
    }

    override fun onDestroy() {
        getSystemService(ConnectivityManager::class.java).unregisterNetworkCallback(network)
        web.destroy()
        super.onDestroy()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun pageView() = WebView(this).apply {
        WebView.setWebContentsDebuggingEnabled(applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0)
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest) = proxy.response(request)
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest) = leave(request.url)
        }
        webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(view: WebView, callback: ValueCallback<Array<Uri>>, params: FileChooserParams): Boolean {
                chosen?.onReceiveValue(null)
                chosen = callback
                pickFiles.launch(params.createIntent())
                return true
            }
        }
    }

    private fun insetFrame(view: WebView) = FrameLayout(this).apply {
        addView(view)
        ViewCompat.setOnApplyWindowInsetsListener(this) { frame, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout() or WindowInsetsCompat.Type.ime())
            frame.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            WindowInsetsCompat.CONSUMED
        }
    }

    private fun open(path: String) {
        if (!pc.paired()) return web.loadUrl(SETUP_URL)
        describeApp()
        web.loadUrl(PAGE_ORIGIN + path)
    }

    private fun describeApp() {
        start?.remove()
        val versionCode = PackageInfoCompat.getLongVersionCode(packageManager.getPackageInfo(packageName, 0))
        val described = JSONObject().put("routes", JSONArray(pc.routes())).put("versionCode", versionCode)
        start = WebViewCompat.addDocumentStartJavaScript(web, "window.sandAppStart = $described", PAGE_ORIGINS)
    }

    private fun leave(url: Uri): Boolean {
        if (url.host == PAGE_HOST) return false
        if (tokenOf(url) != null) return pair(url)
        startActivity(Intent(Intent.ACTION_VIEW, url))
        return true
    }

    private fun pair(link: Uri): Boolean {
        val token = tokenOf(link) ?: return false
        pc.pair(routeOf(link))
        describeApp()
        web.loadUrl("$PAGE_ORIGIN/#pair=$token")
        return true
    }

    private fun scan() {
        GmsBarcodeScanning.getClient(this).startScan().addOnSuccessListener { code -> code.rawValue?.let { pair(Uri.parse(it)) } }
    }

    private fun allowNotices() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) askToNotify.launch(Manifest.permission.POST_NOTIFICATIONS)
        else answerNotices()
    }

    private fun answerNotices() {
        if (noticesShown(this)) Page.noticesAllowed() else Page.noticesRefused(getString(R.string.notifications_off))
    }

    private fun install(apk: Apk) {
        wantedApk = apk
        val permission = installPermission(this)
        if (permission == null) Update.start(this, apk) else allowInstalls.launch(permission)
    }

    private fun networkChanged() {
        pc.forget()
        Page.networkChanged()
    }

    private fun heard(view: WebView, message: WebMessageCompat, origin: Uri, mainFrame: Boolean, reply: JavaScriptReplyProxy) {
        if (!mainFrame) return
        Page.heard(reply)
        val body = JSONObject(message.data ?: return)
        when (body.optString("kind")) {
            "routes" -> {
                pc.follow(stringsOf(body.getJSONArray("routes")))
                describeApp()
            }
            "allow-notices" -> allowNotices()
            "listen" -> Notices.start(this, body.getString("token"))
            "unlisten" -> Notices.stop(this)
            "pair" -> pair(Uri.parse(body.getString("link")))
            "scan" -> scan()
            "install" -> install(Apk(body.getString("url"), body.optString("sha256").ifEmpty { null }))
        }
    }
}

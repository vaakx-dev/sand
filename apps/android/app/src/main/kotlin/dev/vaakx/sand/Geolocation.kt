package dev.vaakx.sand

import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import android.webkit.GeolocationPermissions
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat

private val LOCATION = arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)

private class Asking(val origin: String, val callback: GeolocationPermissions.Callback) {
    fun answer(allowed: Boolean) = callback.invoke(origin, allowed, false)
}

class Geolocation(private val activity: ComponentActivity) {
    private var waiting: Asking? = null

    private val ask = activity.registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
        waiting?.answer(allowed())
        waiting = null
    }

    fun request(origin: String, callback: GeolocationPermissions.Callback) {
        val asking = Asking(origin, callback)
        if (Uri.parse(origin).host != PAGE_HOST) return asking.answer(false)
        if (allowed()) return asking.answer(true)
        waiting?.answer(false)
        waiting = asking
        ask.launch(LOCATION)
    }

    fun cancelled() {
        waiting = null
    }

    private fun allowed() = LOCATION.any { ContextCompat.checkSelfPermission(activity, it) == PackageManager.PERMISSION_GRANTED }
}

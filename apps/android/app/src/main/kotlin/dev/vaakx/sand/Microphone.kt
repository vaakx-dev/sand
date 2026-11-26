package dev.vaakx.sand

import android.Manifest
import android.content.pm.PackageManager
import android.webkit.PermissionRequest
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat

private val AUDIO = arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE)

private fun wantsMicrophone(request: PermissionRequest) =
    request.origin.host == PAGE_HOST && PermissionRequest.RESOURCE_AUDIO_CAPTURE in request.resources

class Microphone(private val activity: ComponentActivity) {
    private var waiting: PermissionRequest? = null

    private val ask = activity.registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        waiting?.let { request -> if (granted) request.grant(AUDIO) else request.deny() }
        waiting = null
    }

    fun request(request: PermissionRequest) {
        if (!wantsMicrophone(request)) return request.deny()
        if (allowed()) return request.grant(AUDIO)
        waiting?.deny()
        waiting = request
        ask.launch(Manifest.permission.RECORD_AUDIO)
    }

    fun cancelled(request: PermissionRequest) {
        if (waiting == request) waiting = null
    }

    private fun allowed() = ContextCompat.checkSelfPermission(activity, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
}

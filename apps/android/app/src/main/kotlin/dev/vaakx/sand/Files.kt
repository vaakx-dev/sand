package dev.vaakx.sand

import android.content.Context
import androidx.core.content.FileProvider
import java.io.File

fun sharedUri(context: Context, file: File) = FileProvider.getUriForFile(context, "${context.packageName}.files", file)

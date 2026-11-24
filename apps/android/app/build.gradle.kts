import groovy.json.JsonSlurper

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val sandVersion = (JsonSlurper().parse(file("../../sand/package.json")) as Map<*, *>)["version"] as String
val keystore = System.getenv("SAND_ANDROID_KEYSTORE")

android {
    namespace = "dev.vaakx.sand"
    compileSdk = 35

    defaultConfig {
        applicationId = "dev.vaakx.sand"
        minSdk = 26
        targetSdk = 35
        versionCode = System.getenv("SAND_ANDROID_VERSION_CODE")?.toInt() ?: 1
        versionName = sandVersion
    }

    signingConfigs {
        create("release") {
            if (keystore != null) {
                storeFile = file(keystore)
                storePassword = System.getenv("SAND_ANDROID_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("SAND_ANDROID_KEY_ALIAS")
                keyPassword = System.getenv("SAND_ANDROID_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName(if (keystore != null) "release" else "debug")
        }
    }

    testOptions {
        unitTests.isIncludeAndroidResources = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.16.0")
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("androidx.fragment:fragment:1.8.9")
    implementation("androidx.webkit:webkit:1.13.0")
    implementation("com.google.android.gms:play-services-code-scanner:16.1.0")
    implementation("com.google.crypto.tink:tink-android:1.20.0")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.robolectric:robolectric:4.16")
}

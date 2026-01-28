# MCP Android Server Manager - ProGuard Configuration
# Production-ready obfuscation rules with proper exception handling

# ==============================================================================
# OPTIMIZATION AND GENERAL SETTINGS
# ==============================================================================

# Optimization level (default is 5)
-optimizationpasses 5

# Keep line numbers for crash reporting and debugging
-keepattributes SourceFile,LineNumberTable,Exceptions,InnerClasses

# Keep method parameter names (useful for debugging)
-keepattributes MethodParameters

# Keep signatures and generic type information
-keepattributes Signature

# Keep annotation information
-keepattributes *Annotation*

# Allow code shrinking
-allowshrinking

# Specify optimization filters
-optimizations !code/simplification/arithmetic,!code/simplification/cast,!field/*,!class/merging/*,code/allocation/variable


# ==============================================================================
# REACT NATIVE AND HERMES
# ==============================================================================

# Keep React Native internals
-keep class com.facebook.react.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.soloader.** { *; }

# Keep React Native modules
-keepclasseswithmembernames class * {
    public <init>(android.content.Context);
}

# Keep React Native native methods
-keepclasseswithmembers class * {
    *** *NativeFunction(...);
}

# Keep React Native bridge components
-keep class com.facebook.react.bridge.** { *; }
-keep interface com.facebook.react.bridge.** { *; }

# Keep Hermes runtime
-keep class com.facebook.hermes.reactexecutor.** { *; }

# Keep native React modules
-keepclasseswithmembernames class * {
    native <methods>;
}


# ==============================================================================
# NODEJS-MOBILE-REACT-NATIVE
# ==============================================================================

# Keep nodejs-mobile native module
-keep class io.github.mvayngrib.nodejs.** { *; }
-keep interface io.github.mvayngrib.nodejs.** { *; }

# Keep nodejs-mobile JNI bindings
-keep class * implements java.lang.reflect.InvocationHandler { *; }

# Keep nodejs module reflection
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep nodejs module interfaces
-keep interface * {
    public <methods>;
}

# Keep reflection-based code used by nodejs
-keepclassmembers class * {
    public *** get*();
    public *** is*();
    public void set*(...);
}

# Keep class members that use reflection
-keepclasseswithmembers class * {
    *** *(...);
}

# Keep enum constructors for nodejs modules
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}


# ==============================================================================
# EXPO AND EXPO MODULES
# ==============================================================================

# Keep Expo SDK
-keep class expo.** { *; }
-keep class org.unimodules.** { *; }

# Keep Expo module interfaces
-keep interface expo.** { *; }
-keep interface org.unimodules.** { *; }

# Keep Expo module implementations
-keepclasseswithmembernames class * {
    public *** *(...);
}

# Keep Expo module metadata
-keepclasseswithmembers class * {
    @org.unimodules.** <methods>;
}

# Keep Expo router components
-keep class expo.router.** { *; }

# Keep Expo file system
-keep class expo.modules.filesystem.** { *; }

# Keep Expo constants
-keep class expo.modules.constants.** { *; }

# Keep Expo crypto
-keep class expo.modules.crypto.** { *; }

# Keep Expo device info
-keep class expo.modules.device.** { *; }

# Keep Expo secure store
-keep class expo.modules.securestore.** { *; }

# Keep Expo task manager
-keep class expo.modules.taskmanager.** { *; }

# Keep Sentry Expo integration
-keep class sentry.expo.** { *; }
-keep class io.sentry.** { *; }


# ==============================================================================
# SERIALIZATION AND REFLECTION
# ==============================================================================

# Keep serializable classes
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# Keep parcelable classes
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# Keep exception classes
-keepclasseswithmembers class * {
    public <init>(java.lang.String);
    public <init>(java.lang.String, java.lang.Throwable);
    public <init>(java.lang.Throwable);
}


# ==============================================================================
# ANDROID FRAMEWORK AND SUPPORT LIBRARIES
# ==============================================================================

# Keep Android framework classes
-keep class android.** { *; }
-keep interface android.** { *; }

# Keep support library
-keep class androidx.** { *; }
-keep interface androidx.** { *; }

# Keep view classes (important for UI)
-keepclasseswithmembernames class * {
    public <init>(android.content.Context, android.util.AttributeSet);
}

# Keep callback interfaces
-keepclassmembers class * {
    public void on*(android.view.View);
    public void on*(...);
}

# Keep Android resources
-keepclassmembers class * {
    public static final int [];
}


# ==============================================================================
# APP-SPECIFIC CLASSES
# ==============================================================================

# Keep MCP Server Manager entry point
-keep class com.mcpserver.manager.** { *; }

# Keep all activity, service, broadcast receiver, and content provider classes
-keep public class * extends android.app.Activity
-keep public class * extends android.app.Service
-keep public class * extends android.content.BroadcastReceiver
-keep public class * extends android.content.ContentProvider

# Keep fragment classes
-keep public class * extends android.app.Fragment
-keep public class * extends androidx.fragment.app.Fragment

# Keep application subclasses
-keep public class * extends android.app.Application {
    public <init>();
    public void onCreate();
}

# Keep preference classes
-keep class * extends android.preference.Preference
-keep class * extends androidx.preference.Preference


# ==============================================================================
# JAVASCRIPT ENGINE AND RUNTIME
# ==============================================================================

# Keep JSCore/V8 runtime
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Keep V8 runtime
-keep class com.eclipsesource.v8.** { *; }

# Keep Chakra runtime (if used)
-keep class *.ChakraCore** { *; }


# ==============================================================================
# SOURCE MAP GENERATION FOR CRASH REPORTING
# ==============================================================================

# Generate source maps for Sentry crash reporting
-printmapping proguard-mapping.txt
-printconfiguration proguard-configuration.txt
-printusage proguard-usage.txt
-verbose

# Keep debug information for stack traces
-keepattributes SourceFile,LineNumberTable


# ==============================================================================
# REFLECTION SAFETY
# ==============================================================================

# Keep classes that use reflection
-keepclasseswithmembers class * {
    *** *(...);
}

# Keep constructor access
-keepclasseswithmembers class * {
    public <init>(...);
}

# Keep field access for reflection
-keepclasseswithmembers class * {
    public *** get*();
    public void set*(...);
}

# Keep method access patterns
-keepclasseswithmembers class * {
    public boolean equals(java.lang.Object);
    public int hashCode();
    public java.lang.String toString();
}


# ==============================================================================
# NATIVE LIBRARY HANDLING
# ==============================================================================

# Keep native method declarations
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep classes with native code
-keep class com.google.android.gms.common.internal.** { *; }


# ==============================================================================
# THIRD-PARTY LIBRARIES
# ==============================================================================

# AsyncStorage
-keep class com.react.asyncstorage.** { *; }

# AJV (JSON Schema Validator)
-keep class com.ajv.** { *; }

# Zustand (state management - mostly JS, but keep any JNI)
-keep class com.zustand.** { *; }

# Gesture handler
-keep class com.swmansion.gesturehandler.** { *; }

# Reanimated
-keep class com.swmansion.reanimated.** { *; }

# Safe area context
-keep class com.th3rdwave.safeareacontext.** { *; }


# ==============================================================================
# WARNINGS SUPPRESSION
# ==============================================================================

# Suppress warnings for unresolved references in dependencies
-dontwarn com.google.**
-dontwarn androidx.**
-dontwarn com.facebook.**
-dontwarn java.awt.**
-dontwarn javax.swing.**
-dontwarn sun.misc.**

# Allow optimization of UTF-8 strings
-optimizations code/simplification/string/concat


# ==============================================================================
# RELEASE BUILD OPTIMIZATIONS
# ==============================================================================

# Remove logging in release builds (optional - comment out if needed)
# -assumenosideeffects class android.util.Log {
#     public static *** d(...);
#     public static *** v(...);
#     public static *** i(...);
# }

# Remove assertions
-assumenoexternalsideeffects class java.lang.* {
    public static void assert*(...);
}

# Optimize common code patterns
-optimizations !code/simplification/arithmetic,!code/simplification/cast

# Keep package-private classes in final packages
-keepnonpubliclibraryclasses
-keepnonpublicprotectedclasses


# ==============================================================================
# CUSTOM APPLICATION RULES
# ==============================================================================

# Keep MCP server protocol classes
-keep class * {
    public *** mcp*(...);
}

# Keep API response models
-keep class * {
    public <init>();
    public *** get*();
    public void set*(...);
}

# Preserve inner classes of kept classes
-keepattributes InnerClasses
-keepclasseswithmembernames class * {
    public *** get*();
}

# Capacitor 8.5.1 supplies plugin-class and JS bridge consumer rules, but not
# the annotation types read by PluginHandle at runtime in R8 full mode.
# Backport the narrow fixes from upstream (pending Capacitor 8.5.4):
# https://github.com/ionic-team/capacitor/blob/main/android/capacitor/proguard-rules.pro
-keep @interface com.getcapacitor.annotation.** { *; }
-keep @interface com.getcapacitor.PluginMethod { *; }
-keep @interface com.getcapacitor.NativePlugin { *; }

# Inherited callbacks can live on non-public plugin base classes.
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.annotation.PermissionCallback <methods>;
}

# Preserve useful source locations in the separately archived R8 mapping.
-keepattributes SourceFile,LineNumberTable

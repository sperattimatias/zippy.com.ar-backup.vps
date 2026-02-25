import 'package:flutter/material.dart';

import '../shared/design/colors.dart';
import '../shared/design/radius.dart';
import '../shared/design/typography.dart';

class ZippyTheme {
  static ThemeData light() {
    final base = ThemeData.dark(useMaterial3: true);
    return base.copyWith(
      scaffoldBackgroundColor: ZippyColors.background,
      cardColor: ZippyColors.surface,
      dividerColor: ZippyColors.divider,
      primaryColor: ZippyColors.primary,
      colorScheme: const ColorScheme.dark(
        primary: ZippyColors.primary,
        secondary: ZippyColors.primaryMuted,
        surface: ZippyColors.surface,
        onPrimary: Colors.black,
        onSurface: ZippyColors.textPrimary,
      ),
      textTheme: base.textTheme.copyWith(
        titleLarge: ZippyTypography.titleLarge,
        titleMedium: ZippyTypography.title,
        bodyMedium: ZippyTypography.body,
        bodySmall: ZippyTypography.caption,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: ZippyColors.surface,
        hintStyle: const TextStyle(color: ZippyColors.textSecondary),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(ZippyRadius.r16),
          borderSide: BorderSide.none,
        ),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(ZippyRadius.r24))),
        showDragHandle: true,
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: ZippyColors.surface,
        contentTextStyle: const TextStyle(color: ZippyColors.textPrimary),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(ZippyRadius.r16)),
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((states) => states.contains(WidgetState.selected) ? ZippyColors.primary : ZippyColors.textSecondary),
        trackColor: WidgetStateProperty.resolveWith((states) => states.contains(WidgetState.selected) ? ZippyColors.primary.withOpacity(0.3) : ZippyColors.divider),
      ),
    );
  }
}

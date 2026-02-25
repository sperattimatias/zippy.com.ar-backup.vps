import 'package:flutter/material.dart';

enum ZippyToastType { success, warning, error }

void showZippyToast(BuildContext context, String text, {ZippyToastType type = ZippyToastType.success}) {
  final color = switch (type) {
    ZippyToastType.success => Colors.green,
    ZippyToastType.warning => Colors.orange,
    ZippyToastType.error => Colors.red,
  };

  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(text), backgroundColor: color),
  );
}

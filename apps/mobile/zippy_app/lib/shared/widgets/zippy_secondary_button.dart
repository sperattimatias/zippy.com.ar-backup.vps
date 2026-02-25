import 'package:flutter/material.dart';

import '../design/colors.dart';
import '../design/radius.dart';

class ZippySecondaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;

  const ZippySecondaryButton({super.key, required this.label, this.onPressed});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: OutlinedButton(
        style: OutlinedButton.styleFrom(
          foregroundColor: ZippyColors.textPrimary,
          side: const BorderSide(color: ZippyColors.divider),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(ZippyRadius.r16)),
        ),
        onPressed: onPressed,
        child: Text(label),
      ),
    );
  }
}

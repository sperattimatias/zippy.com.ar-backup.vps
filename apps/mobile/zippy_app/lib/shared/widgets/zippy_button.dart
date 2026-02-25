import 'package:flutter/material.dart';

import 'zippy_primary_button.dart';

class ZippyButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool busy;

  const ZippyButton({super.key, required this.label, this.onPressed, this.busy = false});

  @override
  Widget build(BuildContext context) {
    return ZippyPrimaryButton(label: label, loading: busy, onPressed: onPressed);
  }
}

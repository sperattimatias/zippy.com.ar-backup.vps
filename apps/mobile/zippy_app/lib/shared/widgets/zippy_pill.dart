import 'package:flutter/material.dart';

import '../design/colors.dart';
import '../design/radius.dart';

class ZippyPill extends StatelessWidget {
  final String text;
  final Color? bg;

  const ZippyPill(this.text, {super.key, this.bg});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(color: bg ?? ZippyColors.brand.withOpacity(0.1), borderRadius: BorderRadius.circular(ZippyRadius.r24)),
      child: Text(text, style: const TextStyle(fontWeight: FontWeight.w600)),
    );
  }
}

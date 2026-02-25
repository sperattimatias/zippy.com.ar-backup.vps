import 'package:flutter/material.dart';

import '../design/colors.dart';
import '../design/radius.dart';
import '../design/shadows.dart';

class ZippyCard extends StatelessWidget {
  final Widget child;
  final EdgeInsets padding;

  const ZippyCard({super.key, required this.child, this.padding = const EdgeInsets.all(20)});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: ZippyColors.surface,
        borderRadius: BorderRadius.circular(ZippyRadius.r20),
        border: Border.all(color: ZippyColors.divider),
        boxShadow: ZippyShadows.soft,
      ),
      child: Padding(padding: padding, child: child),
    );
  }
}

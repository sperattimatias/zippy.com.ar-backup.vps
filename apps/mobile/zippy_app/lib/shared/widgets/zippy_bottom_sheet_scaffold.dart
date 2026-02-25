import 'package:flutter/material.dart';

import '../design/colors.dart';
import '../design/radius.dart';

class ZippyBottomSheetScaffold extends StatelessWidget {
  final String title;
  final Widget child;

  const ZippyBottomSheetScaffold({super.key, required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Container(
        decoration: const BoxDecoration(
          color: ZippyColors.surface,
          borderRadius: BorderRadius.vertical(top: Radius.circular(ZippyRadius.r24)),
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(width: 44, height: 5, decoration: BoxDecoration(color: ZippyColors.divider, borderRadius: BorderRadius.circular(12))),
              const SizedBox(height: 12),
              Row(children: [Text(title, style: Theme.of(context).textTheme.titleMedium!)]),
              const SizedBox(height: 12),
              child,
            ],
          ),
        ),
      ),
    );
  }
}

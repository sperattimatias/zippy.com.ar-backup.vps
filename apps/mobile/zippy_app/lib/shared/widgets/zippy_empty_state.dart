import 'package:flutter/material.dart';

import '../design/colors.dart';
import 'zippy_secondary_button.dart';

class ZippyEmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final String ctaLabel;
  final VoidCallback? onTap;

  const ZippyEmptyState({super.key, required this.icon, required this.title, required this.subtitle, required this.ctaLabel, this.onTap});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 34, color: ZippyColors.textSecondary),
            const SizedBox(height: 16),
            Text(title, textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 10),
            Text(subtitle, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 20),
            ZippySecondaryButton(label: ctaLabel, onPressed: onTap),
          ],
        ),
      ),
    );
  }
}

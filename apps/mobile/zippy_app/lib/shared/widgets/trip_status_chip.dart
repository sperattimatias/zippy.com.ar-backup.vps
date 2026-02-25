import 'package:flutter/material.dart';

import '../design/colors.dart';

class TripStatusChip extends StatefulWidget {
  final String status;
  final bool active;
  const TripStatusChip({super.key, required this.status, this.active = true});

  @override
  State<TripStatusChip> createState() => _TripStatusChipState();
}

class _TripStatusChipState extends State<TripStatusChip> with SingleTickerProviderStateMixin {
  late final AnimationController _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 1100))..repeat(reverse: true);

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedScale(
      duration: const Duration(milliseconds: 150),
      scale: 1,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(color: ZippyColors.surface, borderRadius: BorderRadius.circular(20), border: Border.all(color: ZippyColors.divider)),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (widget.active)
              FadeTransition(
                opacity: Tween<double>(begin: 0.4, end: 1).animate(_pulse),
                child: const Icon(Icons.circle, size: 8, color: ZippyColors.primary),
              ),
            if (widget.active) const SizedBox(width: 7),
            Text(widget.status, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}

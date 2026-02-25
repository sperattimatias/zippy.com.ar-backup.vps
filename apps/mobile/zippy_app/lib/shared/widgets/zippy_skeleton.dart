import 'package:flutter/material.dart';

class ZippySkeleton extends StatefulWidget {
  final double height;
  const ZippySkeleton({super.key, this.height = 14});

  @override
  State<ZippySkeleton> createState() => _ZippySkeletonState();
}

class _ZippySkeletonState extends State<ZippySkeleton> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 1100))..repeat(reverse: true);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (_, __) {
        final opacity = 0.3 + (_controller.value * 0.35);
        return Container(
          height: widget.height,
          decoration: BoxDecoration(color: Colors.grey.withOpacity(opacity), borderRadius: BorderRadius.circular(10)),
        );
      },
    );
  }
}

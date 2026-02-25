import 'package:flutter/material.dart';

class SkeletonBox extends StatelessWidget {
  final double height;
  const SkeletonBox({super.key, this.height = 14});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      decoration: BoxDecoration(
        color: Colors.grey.shade300,
        borderRadius: BorderRadius.circular(10),
      ),
    );
  }
}

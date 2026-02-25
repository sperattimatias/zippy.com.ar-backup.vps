import 'package:flutter/material.dart';

class BadgeChip extends StatelessWidget {
  final String text;
  const BadgeChip(this.text, {super.key});

  @override
  Widget build(BuildContext context) {
    return Chip(label: Text(text));
  }
}

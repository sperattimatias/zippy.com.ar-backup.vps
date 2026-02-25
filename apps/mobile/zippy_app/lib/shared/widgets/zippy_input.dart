import 'package:flutter/material.dart';

class ZippyInput extends StatelessWidget {
  final String label;
  final TextEditingController controller;
  final bool obscure;

  const ZippyInput({super.key, required this.label, required this.controller, this.obscure = false});

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      obscureText: obscure,
      decoration: InputDecoration(labelText: label),
    );
  }
}

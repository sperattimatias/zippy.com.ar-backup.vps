import 'package:flutter/material.dart';

class SafetyPlaceholderPage extends StatelessWidget {
  const SafetyPlaceholderPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Seguridad')),
      body: const Center(child: Text('Check-in y alertas en tiempo real disponibles desde eventos Socket.IO')),
    );
  }
}

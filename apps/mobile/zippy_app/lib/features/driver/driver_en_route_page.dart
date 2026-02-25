import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class DriverEnRoutePage extends StatelessWidget {
  const DriverEnRoutePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Ir a buscar pasajero')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const ListTile(title: Text('Pickup ETA'), trailing: Text('6 min')),
            FilledButton(onPressed: () {}, child: const Text('Abrir en Google Maps')),
            const SizedBox(height: 12),
            FilledButton(onPressed: () => context.push('/driver/otp'), child: const Text('Llegué')),
          ],
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../shared/widgets/zippy_card.dart';

class RoleSelectorPage extends StatelessWidget {
  final List<String> roles;
  const RoleSelectorPage({super.key, this.roles = const ['passenger']});

  @override
  Widget build(BuildContext context) {
    final hasDriver = roles.contains('driver');
    return Scaffold(
      appBar: AppBar(title: const Text('Elegí tu modo')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            ZippyCard(
              child: ListTile(
                title: const Text('Modo Pasajero'),
                subtitle: const Text('Pedir viaje en segundos'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.go('/passenger/home'),
              ),
            ),
            const SizedBox(height: 12),
            ZippyCard(
              child: ListTile(
                title: const Text('Modo Conductor'),
                subtitle: Text(hasDriver ? 'Cuenta aprobada' : 'Estado: UNDER_REVIEW'),
                trailing: const Icon(Icons.chevron_right),
                onTap: hasDriver ? () => context.go('/driver/home') : null,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../shared/widgets/zippy_button.dart';
import '../../shared/widgets/zippy_input.dart';

class RegisterPage extends StatelessWidget {
  RegisterPage({super.key});

  final email = TextEditingController();
  final password = TextEditingController();
  final name = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Registro pasajero')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            ZippyInput(label: 'Nombre', controller: name),
            const SizedBox(height: 12),
            ZippyInput(label: 'Email', controller: email),
            const SizedBox(height: 12),
            ZippyInput(label: 'Password', controller: password, obscure: true),
            const SizedBox(height: 16),
            ZippyButton(label: 'Crear cuenta', onPressed: () => context.go('/login')),
          ],
        ),
      ),
    );
  }
}

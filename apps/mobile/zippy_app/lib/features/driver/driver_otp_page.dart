import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../shared/widgets/zippy_button.dart';
import '../../shared/widgets/zippy_input.dart';

class DriverOtpPage extends StatelessWidget {
  DriverOtpPage({super.key});
  final otp = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Verificar OTP')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            ZippyInput(label: 'OTP de 6 dígitos', controller: otp),
            const SizedBox(height: 16),
            ZippyButton(label: 'Iniciar viaje', onPressed: () => context.push('/ride/in-trip')),
          ],
        ),
      ),
    );
  }
}

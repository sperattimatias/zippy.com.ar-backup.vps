import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../shared/widgets/zippy_card.dart';
import '../../shared/widgets/zippy_input.dart';
import '../../shared/widgets/zippy_primary_button.dart';

class IncomingRequestsPage extends StatefulWidget {
  const IncomingRequestsPage({super.key});

  @override
  State<IncomingRequestsPage> createState() => _IncomingRequestsPageState();
}

class _IncomingRequestsPageState extends State<IncomingRequestsPage> {
  final offer = TextEditingController(text: '2500');
  double timer = 0.64;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Solicitudes cercanas')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ZippyCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Expanded(child: Text('Nuevo pedido', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700))),
                    SizedBox(
                      width: 30,
                      height: 30,
                      child: CircularProgressIndicator(value: timer, strokeWidth: 3),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                const Text('Origen\nAv. Siempre Viva 123', style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                const Text('Destino\nTerminal Central', style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 10),
                const Text('Distancia 4.2 km · Precio base \$2.300'),
                const SizedBox(height: 12),
                ZippyInput(label: 'Tu oferta', controller: offer),
                const SizedBox(height: 12),
                ZippyPrimaryButton(label: 'Enviar oferta', onPressed: () => context.push('/driver/en-route')),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../shared/widgets/zippy_button.dart';
import '../../shared/widgets/zippy_input.dart';

class DestinationSheetPage extends StatelessWidget {
  DestinationSheetPage({super.key});

  final origin = TextEditingController(text: 'Mi ubicación');
  final destination = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Destino')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            ZippyInput(label: 'Origen', controller: origin),
            const SizedBox(height: 12),
            ZippyInput(label: 'Destino', controller: destination),
            const SizedBox(height: 20),
            const ListTile(title: Text('Precio base estimado'), trailing: Text('\$ 2.450')),
            const ListTile(title: Text('ETA'), trailing: Text('8 min')),
            const Spacer(),
            ZippyButton(label: 'Solicitar', onPressed: () => context.push('/ride/waiting')),
          ],
        ),
      ),
    );
  }
}

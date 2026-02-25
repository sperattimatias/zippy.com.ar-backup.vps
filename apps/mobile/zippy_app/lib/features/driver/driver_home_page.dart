import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../shared/copy/messages_es_ar.dart';
import '../../shared/widgets/zippy_card.dart';
import '../../shared/widgets/zippy_empty_state.dart';
import '../../shared/widgets/zippy_pill.dart';

class DriverHomePage extends StatefulWidget {
  const DriverHomePage({super.key});

  @override
  State<DriverHomePage> createState() => _DriverHomePageState();
}

class _DriverHomePageState extends State<DriverHomePage> {
  bool online = false;
  bool blocked = false;

  @override
  Widget build(BuildContext context) {
    if (blocked) {
      return Scaffold(
        appBar: AppBar(title: const Text('Modo Conductor')),
        body: ZippyEmptyState(
          icon: Icons.gpp_bad_outlined,
          title: 'Cuenta en revisión',
          subtitle: MessagesEsAr.holdActive,
          ctaLabel: 'Contactar soporte',
          onTap: () {},
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Modo Conductor')),
      body: Stack(
        children: [
          const GoogleMap(initialCameraPosition: CameraPosition(target: LatLng(-34.6037, -58.3816), zoom: 12)),
          Positioned(
            top: 16,
            left: 16,
            right: 16,
            child: ZippyCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('\$ 48.320', style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 2),
                  const Text('Ganancias hoy', style: TextStyle(color: Colors.white70)),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      const Expanded(child: Text('Online para recibir viajes', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w700))),
                      Switch(value: online, onChanged: (v) => setState(() => online = v)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(online ? 'Activo y visible para pasajeros' : 'Estás offline', style: const TextStyle(color: Colors.white70)),
                  const SizedBox(height: 6),
                  const Row(
                    children: [
                      ZippyPill('Confiable'),
                      SizedBox(width: 8),
                      ZippyPill('Nivel: Plata'),
                    ],
                  ),
                ],
              ),
            ),
          ),
          Positioned(
            bottom: 16,
            left: 16,
            right: 16,
            child: FilledButton(onPressed: online ? () => context.push('/driver/requests') : null, child: const Text('Ver solicitudes cercanas')),
          ),
        ],
      ),
    );
  }
}

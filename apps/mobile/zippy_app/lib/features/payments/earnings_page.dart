import 'package:flutter/material.dart';

class EarningsPage extends StatelessWidget {
  const EarningsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Ganancias')),
      body: ListView(
        children: const [
          ListTile(
            title: Text('Trip #1234'),
            subtitle: Text('Comisión 8% · Bonus -3%'),
            trailing: Text('\$ 4.250'),
          ),
        ],
      ),
    );
  }
}

# Microsoft Bookings mit dem Empfehlungsportal verbinden

## Ziel

Das Portal unterscheidet drei echte Zustände:

1. Die empfohlene Person hat den Empfehlungslink geöffnet.
2. Sie hat die Terminwahl in Microsoft Bookings geöffnet.
3. Microsoft Bookings hat den Termin tatsächlich bestätigt.

Nur der dritte Zustand wird als „Termin vereinbart“ behandelt.

## Technischer Weg

Microsoft stellt für Bookings in Power Automate die Auslöser „When an appointment is Created“, „Updated“ und „Cancelled“ bereit. Jeder Auslöser sendet eine HTTP-Anfrage an:

`https://empfehlungsportal.vercel.app/api/bookings-event`

Erforderlicher Header:

`x-bookings-secret: <BOOKINGS_WEBHOOK_SECRET>`

Erforderlicher JSON-Inhalt bei einer neuen Buchung:

```json
{
  "event": "created",
  "appointmentId": "<SelfServiceAppointmentId>",
  "customerPhone": "<CustomerPhone>",
  "startTime": "<StartTime>",
  "serviceName": "<ServiceName>"
}
```

Für Änderungen wird `event` auf `updated`, für Absagen auf `cancelled` gesetzt. Bei diesen beiden Ereignissen reicht zur sicheren Zuordnung die bestehende `appointmentId`.

## Sicherheitsregeln

- Das Secret wird nur in Vercel, Power Automate und als SHA-256-Hash in Supabase hinterlegt.
- Der Rohwert gehört niemals in Git, Chat, Protokolle oder Screenshots.
- Name und E-Mail aus Bookings werden nicht an das Portal übertragen.
- Die Telefonnummer wird nur mit einer zuvor im Portal gestarteten Terminwahl abgeglichen. Sie wird nicht ein zweites Mal gespeichert.
- Die Telefonnummer muss im verwendeten Bookings-Dienst ein Pflichtfeld sein. Ohne Telefonnummer wird eine neue Buchung bewusst nicht automatisch zugeordnet.

## Aktivierung

1. `schema-phase105.sql` in Supabase anwenden.
2. Ein starkes Secret erzeugen und als `BOOKINGS_WEBHOOK_SECRET` in Vercel hinterlegen.
3. Den SHA-256-Hash als Datensatz `bookings_power_automate` in `private.integration_secrets` hinterlegen.
4. Die drei Power-Automate-Flows für Erstellen, Ändern und Absagen anlegen.
5. Mit einer klar bezeichneten Testempfehlung den vollständigen Weg prüfen.

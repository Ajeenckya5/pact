# Store privacy answers

These answers match the app. Health samples stay on the device. Partner messages are ciphertext. Pact does not use advertising or tracking SDKs.

## App Store privacy label

- Health: not collected by Pact. Apple Health stays on the phone.
- Identifiers: a device-generated pact key. No email or phone number.
- User content: messages are end-to-end encrypted. Pact's server stores ciphertext.
- Location: approximate, only while the app is open, only for weather, optional.
- Tracking: no.

## Play Data safety

- Data is encrypted in transit.
- Health data is not shared and is not sold.
- Users can delete local data in the app and at `/delete`.
- Health Connect declaration: steps, heart rate, HRV, resting heart rate, sleep, exercise, calories, and weight are read to fill Today. The source is shown next to each number.

## Reviewer note

Demo mode is opt-in from "Explore with sample data" and is labeled. A fresh install is empty. Health permission is used to read workouts, sleep, and heart rate the user already stored in Apple Health or Health Connect. Declining Health leaves Today on manual logs.

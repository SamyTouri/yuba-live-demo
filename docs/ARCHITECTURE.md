# Yuba Live — architecture de la solution réelle

> La démo publiée est statique (données fictives simulées). Ce document décrit la solution
> de production proposée : du vocal WhatsApp du jobiste au tableau de bord temps réel du client.

## La chaîne, en 8 étapes

```
 Jobiste                  n8n (ia.codevo.be)                       Supabase              Client Yuba
 ───────                  ──────────────────                       ────────              ───────────
 1. Vocal WhatsApp  ──▶  2. Webhook (WhatsApp Trigger)
                         3. Téléchargement de l'audio       ──▶   Storage + audit
                         4. Transcription (IA, français)
                         5. Extraction structurée (IA)
                         6. Validation + clarification  ◀──▶ WhatsApp (retour jobiste)
                         7. Écriture du rapport           ──▶   reports ──(Realtime)──▶  8. Dashboard live
```

1. **Le jobiste envoie un vocal** sur le numéro WhatsApp Business dédié de Yuba, depuis son propre téléphone — c'est son numéro qui l'identifie. Rien à installer.
2. **Réception dans n8n** via le node natif WhatsApp Trigger (webhook Meta), sur l'instance n8n existante de Codevo.
3. **L'audio est téléchargé** (Graph API) et archivé dans Supabase Storage. Idempotence garantie par l'identifiant unique du message (les doublons de webhook sont ignorés).
4. **Transcription** par `gpt-4o-transcribe` (`language=fr`), avec un lexique métier injecté en prompt (« Yokler, screenbike, chalk-tag, don de sang… ») — robuste au bruit de rue et aux accents.
5. **Extraction structurée** par un LLM léger contraint par un JSON Schema strict : flyers, conversations, personnes transportées, lieu, remarques. Règle d'or : *null si non mentionné, jamais inventé*. Le jobiste et la campagne ne sont **pas** devinés par l'IA : le jobiste est résolu par son numéro de téléphone, la campagne par son affectation du jour.
6. **Validation déterministe** (bornes de plausibilité par type de campagne). Donnée manquante ou ambiguë → message WhatsApp automatique de clarification au jobiste (gratuit dans la fenêtre de 24 h). Maximum 2 relances, puis passage en revue humaine.
7. **Écriture dans Supabase** (`reports`), statut `validated` ou `pending_review`.
8. **Dashboard temps réel** : Supabase Realtime pousse chaque nouveau rapport instantanément. Grâce au RLS, **chaque client de Yuba ne voit que ses propres campagnes**.

## Choix techniques (et pourquoi)

| Brique | Choix | Pourquoi |
|---|---|---|
| WhatsApp entrant | **Meta Cloud API direct** | Vocaux entrants et réponses dans la fenêtre 24 h ≈ 0 €. Twilio facture chaque message sans plus-value ici. Les solutions non officielles (Evolution/WAHA) sont écartées : risque de bannissement du numéro en pleine campagne client. |
| Transcription | **gpt-4o-transcribe** | Meilleur que Whisper en français bruité, et accepte un lexique métier en prompt. ~0,006 $/min. |
| Extraction | LLM léger + **JSON Schema strict** | Sortie garantie conforme au schéma ; l'ambiguïté déclenche la clarification, pas une invention. |
| Base + temps réel | **Supabase** (région EU) | Postgres + RLS + Realtime + Storage en un seul service. Multi-clients propre dès le départ. |
| Orchestration | **n8n self-hosted** (existant) | Aucun coût additionnel, monitoring et reprise sur erreur intégrés. |
| Dashboard | Web statique + supabase-js | Hébergement gratuit (Cloudflare Pages/Vercel), connexion par **magic link** par client. |

## Modèle de données (simplifié)

```
clients ─┬─ campaigns ─┬─ campaign_assignments ─ field_agents (téléphone unique)
         │             └─ reports ─ raw_voice_messages (audio + transcript, audit)
         └─ client_users (accès dashboard, RLS)
```

- Les clients voient des **agrégats par campagne** (vue dédiée), pas le détail nominatif des jobistes.
- Les audios bruts sont purgés après 30-90 jours ; seuls transcript et chiffres sont conservés.
- Personnes transportées = simples compteurs anonymes (aucune donnée personnelle des bénéficiaires).

## Mise en œuvre

| Phase | Contenu | Effort |
|---|---|---|
| 0 | Compte Meta Business vérifié, numéro dédié, webhook | 1-2 j (+ délai de vérification Meta, à lancer tôt) |
| 1 — MVP | Pipeline complet + dashboard read-only mono-client | 4-6 j |
| 2 — V1 | Boucle de clarification, multi-clients (RLS), rappels fin de tournée, revue humaine, branding | 4-6 j |

**Coûts récurrents estimés** (10-30 jobistes actifs, ~600-1 200 vocaux/mois) : **~35-45 €/mois**
(transcription ~7 €, extraction 1-3 €, Supabase Pro 25 €, WhatsApp ≈ 0 €, hébergement 0 €).

## Points d'attention anticipés

- **Qualité audio** : lexique métier, seuil de confiance, clarification automatique, consigne simple aux équipes (vocal au calme en fin de tournée).
- **Oublis** : rappel WhatsApp automatique en fin de tournée + vue « rapports manquants » pour les ops Yuba.
- **Doublons** : idempotence technique + question « correction ou ajout ? » si un second vocal arrive le même jour.
- **RGPD** : données des jobistes couvertes par le contrat étudiant ; purge des audios ; clients limités aux agrégats ; hébergement données en UE.

---

*Codevo — samy@codevo.be — juin 2026*

# addons.mozilla.org listing

The text for each field of the listing, per language. When this file changes on `master`, the **Update AMO listing** workflow sends it to addons.mozilla.org with `scripts/amo-listing.mjs`; you can also start that workflow by hand from the Actions tab. Each heading ends with AMO's locale code in brackets, and each field's text goes in a `text` block under its bold label. The name stays "Cookie Pookie" everywhere. Summaries must be 250 characters or fewer.

The button and switch names in the descriptions match the add-on's translated popup as of version 0.5.0.

## English (en-US)

**Summary**

```text
Automatically rejects cookie consent banners and deletes tracking cookies. Picks "reject" or the most private option on 1,000+ consent platforms, with a per-site switch if a site misbehaves.
```

**Description**

```text
Cookie Pookie quietly handles cookie consent popups for you. When a site shows a consent banner, it chooses "reject all", or the most privacy-friendly option available, and closes the banner. It also deletes tracking cookies, such as those from Google Analytics and the Meta Pixel, the moment a site sets them.

• Works with 1,000+ consent platforms and site-specific banners, using DuckDuckGo's open-source autoconsent rules, updated regularly
• Deletes analytics and advertising cookies (Google Analytics, Meta Pixel, Hotjar, TikTok and more) as soon as they're set. Login, shopping cart, consent and security cookies are left alone
• The toolbar badge shows how many banners were handled on the current page, and the popup tells you which ones
• Each feature has its own switch, and you can turn Cookie Pookie off for one site if something breaks
• "Report a broken site" opens a pre-filled GitHub issue (without the page's query string or anything after #, which can hold personal data)
• Works on Firefox for desktop and Android

Cookie Pookie collects no data. It has no analytics, no tracking and no servers. Everything happens in your browser.
```

**Privacy policy**

```text
Cookie Pookie does not collect, store or transmit any personal data. Its settings (on/off, sites you've turned it off for) are stored only in your browser. The "Report a broken site" button opens a GitHub issue page in your browser with the site's address (without query string or fragment) and version numbers. Nothing is sent unless you choose to submit that issue yourself. Tracking cookies are deleted only in your browser; Cookie Pookie only remembers how many it deleted on the current page, and forgets that when you leave it.
```

## Deutsch (de)

**Summary**

```text
Lehnt Cookie-Banner automatisch ab und löscht Tracking-Cookies. Wählt „Ablehnen“ oder die datenschutzfreundlichste Option auf über 1.000 Consent-Plattformen – mit Schalter pro Website, falls eine Seite Probleme macht.
```

**Description**

```text
Cookie Pookie kümmert sich still um Cookie-Hinweise. Zeigt eine Website ein Cookie-Banner an, wählt Cookie Pookie „Alle ablehnen“ oder die datenschutzfreundlichste verfügbare Option und schließt das Banner. Außerdem löscht es Tracking-Cookies wie die von Google Analytics oder dem Meta-Pixel, sobald eine Website sie setzt.

• Funktioniert mit über 1.000 Consent-Plattformen und Bannern einzelner Websites, dank der quelloffenen, regelmäßig aktualisierten Regeln von DuckDuckGos autoconsent
• Löscht Analyse- und Werbe-Cookies (Google Analytics, Meta-Pixel, Hotjar, TikTok und mehr), sobald sie gesetzt werden. Login-, Warenkorb-, Einwilligungs- und Sicherheits-Cookies bleiben unangetastet
• Das Symbol in der Symbolleiste zeigt, wie viele Banner auf der aktuellen Seite bearbeitet wurden, und das Pop-up verrät, welche
• Beide Funktionen haben einen eigenen Schalter, und für eine einzelne Website lässt sich Cookie Pookie abschalten, falls etwas nicht funktioniert
• „Defekte Website melden“ öffnet ein vorausgefülltes GitHub-Issue (ohne die Parameter der Adresse und ohne alles nach dem #, da dort persönliche Daten stehen können)
• Funktioniert in Firefox für Desktop und Android

Cookie Pookie sammelt keine Daten. Keine Statistiken, kein Tracking, keine Server. Alles passiert in Ihrem Browser.
```

**Privacy policy**

```text
Cookie Pookie erhebt, speichert und überträgt keine personenbezogenen Daten. Die Einstellungen (an/aus, Websites, auf denen es abgeschaltet ist) werden nur in Ihrem Browser gespeichert. Die Schaltfläche „Defekte Website melden“ öffnet in Ihrem Browser eine GitHub-Issue-Seite mit der Adresse der Website (ohne Parameter und Fragment) und Versionsnummern. Es wird nichts gesendet, solange Sie das Issue nicht selbst abschicken. Tracking-Cookies werden ausschließlich in Ihrem Browser gelöscht; Cookie Pookie merkt sich nur, wie viele es auf der aktuellen Seite waren, und vergisst das beim Verlassen der Seite.
```

## Français (fr)

**Summary**

```text
Refuse automatiquement les bannières de cookies et supprime les cookies de suivi. Choisit « Refuser » ou l’option la plus respectueuse de la vie privée sur plus de 1 000 plateformes de consentement, avec un interrupteur par site.
```

**Description**

```text
Cookie Pookie s’occupe discrètement des demandes de consentement aux cookies. Lorsqu’un site affiche une bannière de cookies, il choisit « Tout refuser », ou l’option la plus respectueuse de la vie privée disponible, puis ferme la bannière. Il supprime aussi les cookies de suivi, comme ceux de Google Analytics ou du pixel Meta, dès qu’un site les dépose.

• Fonctionne avec plus de 1 000 plateformes de consentement et bannières propres à certains sites, grâce aux règles open source d’autoconsent de DuckDuckGo, mises à jour régulièrement
• Supprime les cookies de mesure d’audience et publicitaires (Google Analytics, pixel Meta, Hotjar, TikTok et d’autres) dès leur dépôt. Les cookies de connexion, de panier, de consentement et de sécurité ne sont pas touchés
• Le badge de la barre d’outils indique combien de bannières ont été traitées sur la page, et la fenêtre de l’extension précise lesquelles
• Chaque fonction a son propre interrupteur, et Cookie Pookie se désactive pour un seul site si quelque chose ne fonctionne plus
• « Signaler un site défectueux » ouvre un ticket GitHub prérempli (sans les paramètres de l’adresse ni ce qui suit le #, qui peuvent contenir des données personnelles)
• Fonctionne sur Firefox pour ordinateur et Android

Cookie Pookie ne collecte aucune donnée. Pas de statistiques, pas de pistage, pas de serveurs. Tout se passe dans votre navigateur.
```

**Privacy policy**

```text
Cookie Pookie ne collecte, ne stocke ni ne transmet aucune donnée personnelle. Ses réglages (activé ou désactivé, sites où il est désactivé) sont enregistrés uniquement dans votre navigateur. Le bouton « Signaler un site défectueux » ouvre dans votre navigateur une page de ticket GitHub contenant l’adresse du site (sans paramètres ni fragment) et les numéros de version. Rien n’est envoyé tant que vous ne soumettez pas ce ticket vous-même. Les cookies de suivi sont supprimés uniquement dans votre navigateur ; Cookie Pookie retient seulement combien il en a supprimé sur la page en cours, et l’oublie lorsque vous la quittez.
```

## Nederlands (nl)

**Summary**

```text
Weigert cookiebanners automatisch en verwijdert trackingcookies. Kiest ‘weigeren’ of de meest privacyvriendelijke optie op meer dan 1.000 toestemmingsplatforms, met een schakelaar per website als een site niet goed werkt.
```

**Description**

```text
Cookie Pookie handelt cookiemeldingen stilletjes voor je af. Toont een website een cookiebanner, dan kiest Cookie Pookie ‘Alles weigeren’ of de meest privacyvriendelijke optie die er is, en sluit de banner. Ook verwijdert het trackingcookies, zoals die van Google Analytics of de Meta-pixel, zodra een website ze plaatst.

• Werkt met meer dan 1.000 toestemmingsplatforms en banners van afzonderlijke websites, dankzij de opensourceregels van DuckDuckGo’s autoconsent, die regelmatig worden bijgewerkt
• Verwijdert analyse- en advertentiecookies (Google Analytics, Meta-pixel, Hotjar, TikTok en meer) zodra ze worden geplaatst. Cookies voor inloggen, je winkelwagen, toestemming en beveiliging blijven staan
• Het getal op het werkbalkpictogram laat zien hoeveel banners er op de huidige pagina zijn afgehandeld, en de pop-up vertelt welke
• Elke functie heeft een eigen schakelaar, en je zet Cookie Pookie uit voor één website als er iets misgaat
• ‘Website met problemen melden’ opent een vooraf ingevuld GitHub-issue (zonder de parameters in het adres en alles na de #, waar persoonlijke gegevens in kunnen staan)
• Werkt in Firefox voor desktop en Android

Cookie Pookie verzamelt geen gegevens. Geen statistieken, geen tracking, geen servers. Alles gebeurt in je browser.
```

**Privacy policy**

```text
Cookie Pookie verzamelt, bewaart en verstuurt geen persoonsgegevens. De instellingen (aan/uit, websites waarop het uitstaat) worden alleen in je browser opgeslagen. De knop ‘Website met problemen melden’ opent in je browser een GitHub-issuepagina met het adres van de website (zonder parameters of fragment) en versienummers. Er wordt niets verstuurd tenzij je dat issue zelf indient. Trackingcookies worden alleen in je browser verwijderd; Cookie Pookie onthoudt alleen hoeveel het er op de huidige pagina heeft verwijderd, en vergeet dat als je de pagina verlaat.
```

## Español (es-ES)

**Summary**

```text
Rechaza automáticamente los avisos de cookies y elimina las cookies de seguimiento. Elige «Rechazar» o la opción más privada en más de 1000 plataformas de consentimiento, con un interruptor por sitio si alguno falla.
```

**Description**

```text
Cookie Pookie se encarga discretamente de los avisos de consentimiento de cookies. Cuando un sitio muestra un aviso de cookies, elige «Rechazar todo» o la opción más respetuosa con la privacidad que haya, y cierra el aviso. También elimina las cookies de seguimiento, como las de Google Analytics o el píxel de Meta, en cuanto un sitio las crea.

• Funciona con más de 1000 plataformas de consentimiento y avisos de sitios concretos, gracias a las reglas de código abierto de autoconsent de DuckDuckGo, que se actualizan con frecuencia
• Elimina las cookies de analítica y publicidad (Google Analytics, píxel de Meta, Hotjar, TikTok y más) en cuanto se crean. Las cookies de inicio de sesión, carrito, consentimiento y seguridad no se tocan
• La insignia de la barra de herramientas muestra cuántos avisos se han gestionado en la página actual, y la ventana emergente te dice cuáles
• Cada función tiene su propio interruptor, y puedes desactivar Cookie Pookie en un solo sitio si algo deja de funcionar
• «Informar de un sitio con problemas» abre una incidencia de GitHub ya rellenada (sin los parámetros de la dirección ni lo que va después del #, que pueden contener datos personales)
• Funciona en Firefox para escritorio y Android

Cookie Pookie no recopila ningún dato. Sin analíticas, sin rastreo, sin servidores. Todo ocurre en tu navegador.
```

**Privacy policy**

```text
Cookie Pookie no recopila, almacena ni transmite ningún dato personal. Sus ajustes (activado o desactivado, y los sitios en los que lo has desactivado) se guardan solo en tu navegador. El botón «Informar de un sitio con problemas» abre en tu navegador una página de incidencia de GitHub con la dirección del sitio (sin parámetros ni fragmento) y los números de versión. No se envía nada a menos que tú mismo envíes esa incidencia. Las cookies de seguimiento se eliminan solo en tu navegador; Cookie Pookie solo recuerda cuántas ha eliminado en la página actual, y lo olvida al salir de ella.
```

## Italiano (it)

**Summary**

```text
Rifiuta automaticamente i banner dei cookie ed elimina i cookie di tracciamento. Sceglie «Rifiuta» o l’opzione più rispettosa della privacy su oltre 1.000 piattaforme di consenso, con un interruttore per sito se qualcosa non va.
```

**Description**

```text
Cookie Pookie gestisce in silenzio le richieste di consenso ai cookie. Quando un sito mostra un banner dei cookie, sceglie «Rifiuta tutto» o l’opzione più rispettosa della privacy disponibile, e chiude il banner. Elimina anche i cookie di tracciamento, come quelli di Google Analytics o del pixel di Meta, appena un sito li imposta.

• Funziona con oltre 1.000 piattaforme di consenso e banner di singoli siti, grazie alle regole open source di autoconsent di DuckDuckGo, aggiornate regolarmente
• Elimina i cookie di analisi e pubblicitari (Google Analytics, pixel di Meta, Hotjar, TikTok e altri) appena vengono impostati. I cookie di accesso, del carrello, del consenso e di sicurezza restano intatti
• Il badge sulla barra degli strumenti mostra quanti banner sono stati gestiti nella pagina corrente, e il pop-up ti dice quali
• Ogni funzione ha il suo interruttore, e puoi disattivare Cookie Pookie per un solo sito se qualcosa smette di funzionare
• «Segnala un sito non funzionante» apre una segnalazione GitHub precompilata (senza i parametri dell’indirizzo e senza ciò che segue il #, che possono contenere dati personali)
• Funziona su Firefox per desktop e Android

Cookie Pookie non raccoglie alcun dato. Niente statistiche, niente tracciamento, niente server. Tutto avviene nel tuo browser.
```

**Privacy policy**

```text
Cookie Pookie non raccoglie, memorizza né trasmette alcun dato personale. Le impostazioni (attivo o disattivo, siti su cui è disattivato) sono salvate solo nel tuo browser. Il pulsante «Segnala un sito non funzionante» apre nel tuo browser una pagina di segnalazione GitHub con l’indirizzo del sito (senza parametri né frammento) e i numeri di versione. Non viene inviato nulla a meno che tu non invii la segnalazione. I cookie di tracciamento vengono eliminati solo nel tuo browser; Cookie Pookie ricorda soltanto quanti ne ha eliminati nella pagina corrente, e lo dimentica quando la lasci.
```

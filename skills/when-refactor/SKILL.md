---
name: when-refactor
title: When Refactor
description: Red Green Refactor is a well known software cycle, perfect for TDD approach. But WHEN one should apply the refactoring in the short and mid term of a development activity?
---

# When Refactor

Red Green Refactor è un ciclo ben noto, perfetto per TDD. Ma **quando** si applica il refactoring, nel breve e medio termine di uno sviluppo?

## Il pericolo

Quando l'agente refactora prematuramente — subito dopo la fase Green di ogni test o suite individuale:

- Crea helper private annidate tipo `f1()` chiama `f2()` chiama `f3()` — il flusso diventa più difficile da leggere prima di essere completato.
- I nomi delle funzioni diventano ridotti a soddisfare il conteggio di righe, non dopo ciò che fanno.
- Il "debito" viene poi pagato con gli interessi: ogni modifica futura deve navigare tra i piccoli pezzi invece di vedere il blocco unico.

## L'approccio corretto

Aspettare a fare refactoring alla fine di **tutta** la funzionalità.

- Si ha la visione d'insieme: quali 100 righe possono diventare una libreria condivisa, quali sono duplicati, quale estrazione ha senso di dominio.
- Il refactoring è un colpo solo e le decisioni sono chiare.

## Principi generali

- Le regressioni temporanee sono accettate, sia in termini di debito passeggero, sia in termini di pezzi vecchi da buttare a costo di rompere le cose.
- Quando si affronta un refactoring corposo e già si sa che si vuole cancellare dei pezzi, meglio cancellarli subito e avere meno bagaglio.
- I problemi di "lint" minori vanno rivisti alla fine, non durante. Il refactoring può mutare molto in base a **quando** è fatto: è dannoso stare attenti a cose tipo numero di linee per file o per funzione all'inizio; all'inizio è meglio accorpare e quando tutto funziona, si sistema in un colpo solo alla fine.

## Come usarla nel ciclo RGR (medio termine)

1. **Red.** Scrivi il test che cattura il comportamento desiderato.
2. **Green.** Implementa come un blocco unico e coeso. Ignora `max-lines`, `max-lines-per-function`, `max-statements`, `complexity`. Una funzione da 80-90 righe che fa tutto è accettabile qui. L'obiettivo è avere il flusso completo visibile e verde end-to-end.
3. **Refactor (una fase unica, prima del merge).** Solo ora, con tutti i test verdi e il comportamento provato, estrai helper, moduli, librerie. Per decidere cosa rifattorizzare usa `code-quality-smells`. Le estrazioni devono essere piatte e semantiche: niente catene di helper privati (`f1` chiama `f2` chiama `f3`), e un helper più corto della sua stessa firma si riassorbe. Tagli che hanno senso semantico, non per abbassare i conteggi di lint. Poi corri lint una volta e sistemi quel che resta. La feature non è done finché non è fatto. Se il refactoring è troppo corposo o rischioso ora, è ok chiedere di rimandarne una parte; se si rimanda, annotare cosa resta da fare.
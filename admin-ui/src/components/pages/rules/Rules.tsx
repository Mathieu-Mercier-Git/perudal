import React, { ReactNode, useEffect } from 'react';
import { Icon } from '@mui/material';
import { getGlobalInstance } from 'plume-ts-di';
import { useObservable } from 'micro-observables';
import RulesOverlayService, {
  RULES_SECTION_EXACT,
  RULES_SECTION_PLANIFICATO,
} from '../../../services/rules/RulesOverlayService';

const scrollToSection = (section: string) => {
  document.getElementById(section)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
};

type SectionLinkProps = {
  section: string,
  children: ReactNode,
};

// Lien interne aux règles : fait défiler le contenu jusqu'à la section visée
function SectionLink({ section, children }: SectionLinkProps) {
  return (
    <button type="button" className="rules__link" onClick={() => scrollToSection(section)}>
      {children}
    </button>
  );
}

export default function Rules() {
  const rulesOverlayService = getGlobalInstance(RulesOverlayService);
  const isOpen: boolean = useObservable(rulesOverlayService.isRulesOpen());
  const targetSection: string | undefined = useObservable(rulesOverlayService.getTargetSection());

  // Ouverture sur une section précise (ex. bannière de l'accueil) : on y fait défiler le contenu
  useEffect(() => {
    if (!isOpen || !targetSection) {
      return;
    }
    document.getElementById(targetSection)?.scrollIntoView({ block: 'start' });
  }, [isOpen, targetSection]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="rules-overlay" role="dialog" aria-modal="true" aria-label="Règles du jeu">
      <div className="rules">
        <header className="rules__header">
          <button
            type="button"
            className="rules__back"
            onClick={() => rulesOverlayService.close()}
            aria-label="Fermer les règles"
          >
            <Icon>arrow_back</Icon>
          </button>
          <h1 className="rules__title">Règles du jeu</h1>
        </header>

        <div className="rules__content">
          <section className="rules__section">
            <h2 className="rules__section-title">1. But du jeu</h2>
            <p>
              Le vainqueur est le dernier joueur à posséder un ou plusieurs dés.
            </p>
          </section>

          <section className="rules__section">
            <h2 className="rules__section-title">2. Déroulement d'une partie</h2>
            <p>
              À chaque début de tour, le joueur a un ou plusieurs dés à sa disposition.
            </p>
            <p>
              Le premier joueur doit faire une proposition : il annonce tout haut une valeur de dé
              et un nombre de dés, principalement en fonction de son tirage. Il doit théoriquement
              se rapprocher au mieux de la réalité, mais il peut aussi bluffer en racontant
              n'importe quoi.
            </p>
            <div className="rules__example">
              <span className="rules__example-label">Exemple</span>
              Dans une partie à 4 joueurs, les dés du premier joueur indiquent 2, 2, 2. Annoncer
              « au moins 3 dés de valeur 2 » est plausible : il en possède déjà 3 lui-même.
            </div>
            <div className="rules__example">
              <span className="rules__example-label">Exemple</span>
              Dans une partie à 4 joueurs, les dés du premier joueur indiquent 2, 2, 3, 4 et 4.
              S'il annonce « il y a au moins 8 dés de valeur 6 autour de la table » alors qu'il ne
              possède aucun dé de valeur 6, il est en plein bluff.
            </div>
            <p>
              C'est ensuite au joueur à sa gauche de parler. Il a 3 choix :
            </p>
            <ul className="rules__list">
              <li>
                <strong>Menteur</strong> : il estime que l'affirmation précédente est fausse et
                l'annonce tout haut.
              </li>
              <li>
                <strong>Surenchérir</strong> : il estime que l'affirmation est plausible et annonce
                à son tour une surenchère.
              </li>
              <li>
                <strong>Chiffre exact</strong> : il peut aussi, dans certains cas, dire
                « chiffre exact » (
                <SectionLink section={RULES_SECTION_EXACT}>voir les cas particuliers</SectionLink>
                ).
              </li>
            </ul>
          </section>

          <section className="rules__section">
            <h2 className="rules__section-title">3. Menteur</h2>
            <p>
              Le maître du jeu (en local) clique sur « Révéler tous les dés » :
            </p>
            <ul className="rules__list">
              <li>
                Si la proposition est <strong>exacte</strong> (le nombre de dés de la valeur choisie
                est supérieur ou égal à ce qui était annoncé), le joueur qui a dit « menteur » perd
                la manche : il place un de ses dés sous le couvercle.
              </li>
              <li>
                Si la proposition est <strong>fausse</strong> (le nombre de dés de la valeur choisie
                est inférieur à ce qui était annoncé), c'est le joueur qui avait fait l'annonce qui
                perd la manche et place un de ses dés sous le couvercle.
              </li>
            </ul>
            <p>
              Un joueur qui perd son dernier dé est éliminé de la partie.
            </p>
          </section>

          <section className="rules__section">
            <h2 className="rules__section-title">4. Surenchère</h2>
            <p>Pour surenchérir, le joueur peut :</p>
            <ul className="rules__list">
              <li>soit augmenter la valeur des dés ;</li>
              <li>soit augmenter le nombre de dés ;</li>
              <li>soit augmenter les deux.</li>
            </ul>
            <p>
              Une fois ce choix fait, il annonce sa nouvelle proposition et c'est au joueur à sa
              gauche de parler. Ce dernier peut dire « menteur » ou surenchérir, et ainsi de suite.
            </p>
            <div className="rules__example">
              <span className="rules__example-label">Exemple</span>
              Le joueur précédent a annoncé « au moins 5 dés de valeur 4 ». On peut annoncer
              « au moins 7 dés de valeur 4 » (on augmente le nombre de dés), « au moins 5 dés
              de valeur 5 » (on augmente la valeur des dés), ou « au moins 6 dés de valeur 6 »
              (on augmente les deux).
            </div>
          </section>

          <section className="rules__section">
            <h2 className="rules__section-title">5. Manche suivante</h2>
            <p>
              Après un « menteur » et la perte d'un dé, on recommence une nouvelle manche. Le joueur
              qui vient de perdre un dé devient le nouveau premier joueur. S'il vient d'être éliminé,
              ce rôle revient au joueur à sa gauche.
            </p>
          </section>

          <section className="rules__section">
            <h2 className="rules__section-title">6. Cas particuliers</h2>

            <h3 className="rules__subtitle">a) Les pérudos</h3>
            <p>
              Les dés qui montrent la tête du pérudo (le toucan) sont spéciaux : ce sont des jokers.
            </p>
            <ul className="rules__list">
              <li>
                <strong>Ce sont des jokers.</strong> Lorsque les dés sont révélés après un
                « menteur », les pérudos prennent la valeur de la dernière proposition exprimée.
              </li>
              <li>
                <strong>On ne peut pas commencer avec des pérudos.</strong> Sauf en étant en
                « planificato » (
                <SectionLink section={RULES_SECTION_PLANIFICATO}>voir ci-dessous</SectionLink>
                ), on ne peut pas ouvrir une manche en annonçant un nombre de pérudos.
              </li>
              <li>
                <strong>On peut proposer des pérudos.</strong> Il faut alors annoncer au moins la
                moitié de la proposition précédente, arrondie à l'entier supérieur.
              </li>
            </ul>
            <div className="rules__example">
              <span className="rules__example-label">Exemple</span>
              On révèle les dés après un « menteur ». La proposition précédente est « au moins 9 dés
              de valeur 3 » : pour vérifier, on ajoute les pérudos aux dés qui indiquent 3.
            </div>
            <div className="rules__example">
              <span className="rules__example-label">Exemple</span>
              Le joueur précédent a annoncé « au moins 7 dés de valeur 4 ». Le joueur suivant peut
              dire « au moins 4 dés pérudo » (la moitié de 7, arrondie au supérieur).
            </div>
            <p>
              Une fois un nombre de pérudos annoncé, le joueur suivant peut soit augmenter le nombre
              de pérudos, soit revenir à une valeur de dé classique. Dans ce cas, il doit annoncer
              au moins le double de la proposition précédente, plus un.
            </p>
            <div className="rules__example">
              <span className="rules__example-label">Exemple</span>
              Si un joueur a annoncé 4 pérudos, le joueur suivant qui veut repasser sur une valeur
              de dé doit annoncer au moins 9 dés (le double plus un).
            </div>

            <h3 id={RULES_SECTION_PLANIFICATO} className="rules__subtitle">
              b) Le planificato
              <span className="rules__subtitle-aside">
                (oui, ce n'est pas le vrai nom, mais ça sonne mieux)
              </span>
            </h3>
            <p>
              Dès qu'un joueur n'a plus qu'un seul dé dans son gobelet, il est alors en
              « planificato ». Il sera le premier joueur de la manche suivante. Lors de cette manche,
              les pérudos ne sont pas des jokers et aucun joueur ne peut modifier la valeur du dé
              proposé par le premier joueur.
            </p>
            <p>
              Un joueur n'est « planificato » que durant la manche qui suit celle où il s'est retrouvé
              avec un seul dé, pas lors des suivantes.
            </p>
            <p className="rules__note rules__note--info">
              <Icon className="rules__note-icon">info</Icon>
              <span>
                Exception : un joueur qui tombe à un seul dé à cause du <strong>chiffre exact</strong> réussi
                d'un autre joueur n'est <strong>pas</strong> en planificato.
              </span>
            </p>

            <h3 id={RULES_SECTION_EXACT} className="rules__subtitle">
              c) Chiffre exact
              <span className="rules__subtitle-aside">(variante française)</span>
            </h3>
            <p>
              Ici, on joue la variante française : <strong>seul le joueur dont c'est le tour</strong> peut
              dire « chiffre exact », à la place de « menteur » ou d'une surenchère. Il l'annonce s'il
              pense que la dernière proposition est strictement exacte (le nombre de dés de la valeur
              choisie est exactement égal à l'annonce, et non supérieur ou égal).
            </p>
            <ul className="rules__list">
              <li>
                S'il a raison, il récupère un des dés qu'il avait perdus. S'il a déjà tous ses dés,
                ce sont tous les autres joueurs encore en jeu qui perdent un dé.
              </li>
              <li>S'il a tort, il perd un dé.</li>
            </ul>
            <p>
              Qu'il gagne ou qu'il perde, celui qui a dit « chiffre exact » est toujours le premier
              joueur de la manche suivante.
            </p>
            <p className="rules__note rules__note--info">
              <Icon className="rules__note-icon">info</Icon>
              <span>
                Le chiffre exact n'est <strong>pas autorisé</strong> quand il ne reste
                que <strong>deux joueurs</strong>, ni pendant un <strong>planificato</strong>.
              </span>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

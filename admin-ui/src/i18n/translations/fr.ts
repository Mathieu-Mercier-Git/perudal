import { Translations } from './Translations';

const frMessages: Translations = {
  app: {
    name: 'Pérudal',
  },
  // actions
  action: {
    back: 'Retour',
    cancel: 'Annuler',
    save: 'Enregistrer',
    delete: 'Supprimer',
    search: 'Rechercher',
    add: 'Ajouter',
    authenticate: 'Me connecter',
    disconnect: 'Me déconnecter',
    keep_editing: 'Rester sur la page',
    close_without_saving: 'Fermer sans sauvegarder',
    start_game: 'Lancer la partie',
    cancel_game: 'Annuler la partie',
    create_game: 'Créer une partie',
    join_game: 'Rejoindre une partie',
    quit_game: 'Quitter la partie',
    confirm: 'Confirmer',
    close: 'Fermer',
  },
  // common labels
  label: {
    creation_date: 'Date de création',
    loading: 'Chargement...',
  },
  // common messages
  message: {
    changes_saved: 'Les modifications ont bien été enregistrées',
    unsaved_data: 'Des modifications n\'ont pas été enregistrées. '
      + 'Si vous voulez enregistrer ces modifications, cliquez sur le bouton "Rester sur la page"',
    confirm_delete: 'Pour confirmer la suppression, cliquez sur le bouton "Supprimer"',
  },
  // navigation
  nav: {
    home: 'Accueil',
    users: 'Gestion des utilisateurs',
    user_list: 'Utilisateurs',
  },
  // home
  home: {
    title: 'Pérudal',
  },
  login: {
    title: 'Se connecter',
  },
  lobby: {
    title: 'Lobby',
    perucode: 'Pérucode de la partie : ',
    dice_number: 'Nombre de dés : ',
    player_list: 'Liste des participants : ',
    mode: 'Mode de jeu',
    mode_local: 'Local',
    mode_online: 'En ligne',
    mode_local_help: 'Vous êtes dans la même pièce ou en appel : '
      + 'les mises se disent à voix haute, l\'appli gère les dés.',
    mode_online_help: 'Chacun mise à son tour directement dans l\'appli. '
      + 'Idéal à distance : pas besoin d\'un autre canal pour se parler.',
  },
  // partie en ligne
  online_game: {
    title: 'Partie en ligne',
    title_planificato: 'Pla pla planificato',
    title_result: 'Fin du tour',
    dice_unit: 'dés',
    menu: 'Menu',
    turn_of: 'Au tour de',
    your_turn: 'À toi de jouer !',
    your_turn_bid: 'À toi de jouer : fais ta mise',
    you: 'Toi',
    has_bid: 'a parié',
    thinking: 'réfléchit',
    waiting: 'en attente',
    eliminated: 'éliminé',
    departed: 'a quitté la partie',
    dice_count: (count: number) => `${count} dé${count > 1 ? 's' : ''}`,
    my_dice: 'Tes dés',
    my_position: 'ta position',
    show_my_dice: 'Voir mes dés',
    hide_my_dice: 'Masquer mes dés',
    no_dice: 'Ils sont où tes dés ? Remets toi en question bonhomme.',
    bid_to_beat: 'Mise à battre',
    you_open: 'Tu ouvres la manche',
    bid: 'Parier',
    liar: 'Menteur !',
    exact: 'Chiffre exact',
    cancel: 'Annuler',
    bid_text: (quantity: number, face: number) => (face === 1
      ? `${quantity} perudo${quantity > 1 ? 's' : ''}`
      : `${quantity} × ${face}`),
    quantity_label: 'Dés',
    face_label: 'Valeur',
    face_label_perudo: 'Perudo',
    quantity_up: 'Un dé de plus',
    quantity_down: 'Un dé de moins',
    face_up: 'Valeur au-dessus',
    face_down: 'Valeur en dessous',
    valid_bid: 'Mise valide',
    invalid_out_of_range: (totalDice: number) => `Il n'y a que ${totalDice} dés en jeu`,
    invalid_opening_perudo: 'On ne peut pas ouvrir une manche en perudos',
    invalid_planificato: (face: number) => `Planificato : la valeur reste ${face}, monte seulement le nombre`,
    invalid_classic: 'Mise trop faible : monte le nombre ou la valeur',
    invalid_to_perudo: (minimum: number) => `Mise trop faible : il faut au moins ${minimum} `
      + `perudo${minimum > 1 ? 's' : ''}`,
    invalid_from_perudo: (minimum: number) => `Mise trop faible : il faut au moins ${minimum} dés `
      + 'pour quitter les perudos',
    invalid_perudo: (quantity: number) => `Mise trop faible : il faut plus de ${quantity} `
      + `perudo${quantity > 1 ? 's' : ''}`,
    back: 'Retour',
    validate_bid: 'Valider la mise',
    liar_by_you: (bidder: string) => `Tu as dit « Menteur ! » à ${bidder}`,
    liar_on_you: (name: string) => `${name} t'a dit « Menteur ! »`,
    liar_by: (name: string, bidder: string) => `${name} a dit « Menteur ! » à ${bidder}`,
    exact_by_you: (bidder: string) => `Tu as annoncé « Chiffre exact » sur la mise de ${bidder}`,
    exact_on_you: (name: string) => `${name} a annoncé « Chiffre exact » sur ta mise`,
    exact_by: (name: string, bidder: string) => `${name} a annoncé « Chiffre exact » sur la mise de ${bidder}`,
    verdict_won: 'Gagné',
    verdict_lost: 'Perdu',
    verdict_loses: (name: string) => `${name} perd un dé`,
    verdict_gains: (name: string) => `${name} gagne un dé`,
    verdict_others_lose: (name: string) => `Tous les joueurs sauf ${name} perdent un dé`,
    verdict_nobody: 'Personne ne perd de dé',
    bid_label: 'Mise',
    on_table: 'Sur la table',
    round_result: 'Résultat du tour',
    minus_one: '−1 dé',
    plus_one: '+1 dé',
    next_starter: (name: string) => `${name} commence le prochain tour`,
    next_starter_you: 'Tu commences le prochain tour',
    next_round: 'Tour suivant',
    waiting_for_host: 'En attente du meneur',
    confirm_cancel_game: 'Es-tu sûr de vouloir annuler la partie ?',
    confirm_quit_game: 'Es-tu sûr de vouloir quitter la partie ?',
  },
  // users
  users: {
    userName: 'Nom d\'utilisateur',
    password: 'Mot de passe',
    email: 'E-mail',
    firstName: 'Prénom',
    lastName: 'Nom',
    role: 'Rôle',
  },
  // pages users
  user: {
    title_list: 'Liste des utilisateurs',
    title_create: 'Création d\'un utilisateur',
    title_edit: 'Modification d\'un utilisateur',
    password_confirm: 'Confirmation du mot de passe',
    error_passwords_different: 'Le mot de passe et sa confirmation sont différents',
  },
  // errors
  error: {
    field: {
      required: 'Le champ est requis',
      email_wrong_format: 'L\'adresse e-mail saisie semble être incorrecte',
    },
    username_missing: 'Choisie ton pseudo pour aller plus loin',
    username_too_short: 'Ton pseudo est trop court'
  },
  'http-errors': {
    INTERNAL_ERROR: 'Une erreur inattendue s\'est produite',
    NETWORK_ERROR: 'Erreur réseau, votre connexion internet semble indisponible',
    TIMEOUT_ERROR: 'Erreur réseau (timeout), votre connexion internet ou le serveur distant semble indisponible',
    FORBIDDEN_ERROR: 'Il semble que vous n\'avez pas accès à cette ressource ou à cette action',
    WRONG_LOGIN_OR_PASSWORD: 'Nom d\'utilisateur ou mot de passe incorrect',
    // eslint-disable-next-line max-len
    TOO_MANY_WRONG_ATTEMPTS: (seconds: string) => `Suite à des erreurs dans la saisie de vos identifiants, votre compte est verrouillé pendant ${seconds} secondes, veuillez-vous reconnecter ultérieurement`,
    FIELD_REQUIRED: (fieldName: string) => `Le champ '${fieldName}' est requis`,
    MESSAGE: (message: string) => message,
    GAME_NOT_FOUND: 'Cette partie n\'existe plus',
    GAME_NOT_STARTED: 'La partie n\'a pas encore commencé',
    WRONG_GAME_MODE: 'Cette action n\'est pas disponible dans ce mode de jeu',
    NOT_YOUR_TURN: 'Ce n\'est pas ton tour',
    INVALID_BID: 'Cette mise n\'est pas valide',
    NO_BID_TO_CHALLENGE: 'Il n\'y a pas encore de mise à contester',
    EXACT_NOT_ALLOWED: 'Le chiffre exact n\'est pas autorisé en planificato ni quand il ne reste que deux joueurs',
  },
} as const;

export default frMessages;

import { Translations } from './Translations';

const enMessages: Translations = {
  app: {
    name: 'Plume admin',
  },
  // actions
  action: {
    back: 'Back',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    search: 'Search',
    add: 'Add',
    authenticate: 'Log in',
    disconnect: 'Log out',
    keep_editing: 'Keep editing',
    close_without_saving: 'Close without saving',
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
    creation_date: 'Creation date',
    loading: 'Loading...',
  },
  // common messages
  message: {
    changes_saved: 'Changes have been successfully saved',
    unsaved_data: 'There are unsaved changes. '
      + 'If you would like to save changes, press the "Keep editing" button',
    confirm_delete: 'To confirm the deleting, press the "Delete" button',
  },
  // navigation
  nav: {
    home: 'Home',
    users: 'User management',
    user_list: 'Users',
  },
  // home
  home: {
    title: 'Home page',
  },
  login: {
    title: 'Please authenticate',
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
  // online game
  online_game: {
    title: 'Online game',
    title_planificato: 'Pla pla planificato',
    title_result: 'End of the round',
    dice_unit: 'dice',
    menu: 'Menu',
    turn_of: 'Turn of',
    your_turn: 'Your turn!',
    your_turn_bid: 'Your turn: place your bid',
    you: 'You',
    has_bid: 'bid',
    thinking: 'thinking',
    waiting: 'waiting',
    eliminated: 'eliminated',
    departed: 'left the game',
    dice_count: (count: number) => `${count} di${count > 1 ? 'ce' : 'e'}`,
    my_dice: 'Your dice',
    my_position: 'your position',
    show_my_dice: 'Show my dice',
    hide_my_dice: 'Hide my dice',
    no_dice: 'Where are your dice? Time to question yourself.',
    bid_to_beat: 'Bid to beat',
    you_open: 'You open the round',
    bid: 'Bid',
    liar: 'Liar!',
    exact: 'Exact count',
    cancel: 'Cancel',
    bid_text: (quantity: number, face: number) => (face === 1
      ? `${quantity} perudo${quantity > 1 ? 's' : ''}`
      : `${quantity} × ${face}`),
    quantity_label: 'Dice',
    face_label: 'Value',
    face_label_perudo: 'Perudo',
    quantity_up: 'One more die',
    quantity_down: 'One less die',
    face_up: 'Higher value',
    face_down: 'Lower value',
    valid_bid: 'Valid bid',
    invalid_out_of_range: (totalDice: number) => `There are only ${totalDice} dice in play`,
    invalid_opening_perudo: 'A round cannot be opened with perudos',
    invalid_planificato: (face: number) => `Planificato: the value stays ${face}, only raise the quantity`,
    invalid_classic: 'Bid too low: raise the quantity or the value',
    invalid_to_perudo: (minimum: number) => `Bid too low: you need at least ${minimum} `
      + `perudo${minimum > 1 ? 's' : ''}`,
    invalid_from_perudo: (minimum: number) => `Bid too low: you need at least ${minimum} dice `
      + 'to leave perudos',
    invalid_perudo: (quantity: number) => `Bid too low: you need more than ${quantity} `
      + `perudo${quantity > 1 ? 's' : ''}`,
    back: 'Back',
    validate_bid: 'Confirm bid',
    liar_by_you: (bidder: string) => `You said « Liar! » to ${bidder}`,
    liar_on_you: (name: string) => `${name} said « Liar! » to you`,
    liar_by: (name: string, bidder: string) => `${name} said « Liar! » to ${bidder}`,
    exact_by_you: (bidder: string) => `You called « Exact count » on ${bidder}'s bid`,
    exact_on_you: (name: string) => `${name} called « Exact count » on your bid`,
    exact_by: (name: string, bidder: string) => `${name} called « Exact count » on ${bidder}'s bid`,
    verdict_won: 'Won',
    verdict_lost: 'Lost',
    verdict_loses: (name: string) => `${name} loses a die`,
    verdict_gains: (name: string) => `${name} wins a die`,
    verdict_others_lose: (name: string) => `Everyone except ${name} loses a die`,
    verdict_nobody: 'Nobody loses a die',
    bid_label: 'Bid',
    on_table: 'On the table',
    round_result: 'Round result',
    minus_one: '−1 die',
    plus_one: '+1 die',
    next_starter: (name: string) => `${name} starts the next round`,
    next_starter_you: 'You start the next round',
    next_round: 'Next round',
    next_round_soon: 'Next round…',
    confirm_cancel_game: 'Are you sure you want to cancel the game?',
    confirm_quit_game: 'Are you sure you want to leave the game?',
  },
  // users
  users: {
    userName: 'User name',
    password: 'Password',
    email: 'Email',
    firstName: 'First name',
    lastName: 'Last name',
    role: 'Role',
  },
  // pages users
  user: {
    title_list: 'Users list',
    title_create: 'User creation',
    title_edit: 'User modification',
    password_confirm: 'Password confirmation',
    error_passwords_different: 'Password do not match its confirmation',
  },
  // errors
  error: {
    field: {
      required: 'Field is required',
      email_wrong_format: 'The input email address is invalid',
    },
    username_missing: 'Choisie ton pseudo pour aller plus loin',
    username_too_short: 'Ton pseudo est trop court',
    perucode_missing: 'Enter the game\'s pérucode',
    perucode_unknown: 'This pérucode does not match any game, please check it',
    game_already_started: 'This game has already started, you can\'t join it',
  },
  'http-errors': {
    INTERNAL_ERROR: 'An unexpected error occurred',
    NETWORK_ERROR: 'Network error, your internet connexion seems unavailable',
    TIMEOUT_ERROR: 'Network error (timeout), your internet connection or the remote server seem unavailable',
    FORBIDDEN_ERROR: 'It seems you do not have access to this resource or this action',
    WRONG_LOGIN_OR_PASSWORD: 'User name or password incorrect',
    // eslint-disable-next-line max-len
    TOO_MANY_WRONG_ATTEMPTS: (seconds: string) => `Due to login attempt errors, your account is locked for ${seconds} seconds, please try again later`,
    FIELD_REQUIRED: (fieldName: string) => `Field '${fieldName}' is required`,
    MESSAGE: (message: string) => message,
    GAME_NOT_FOUND: 'This game no longer exists',
    GAME_NOT_STARTED: 'The game has not started yet',
    WRONG_GAME_MODE: 'This action is not available in this game mode',
    NOT_YOUR_TURN: 'It is not your turn',
    INVALID_BID: 'This bid is not valid',
    NO_BID_TO_CHALLENGE: 'There is no bid to challenge yet',
    EXACT_NOT_ALLOWED: 'Exact count is not allowed in planificato or when only two players are left',
  },
} as const;

export default enMessages;

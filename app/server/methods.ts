import Songs, {Song, Revisions, rmd_version} from '../imports/api/collections';
import { check } from 'meteor/check';

Meteor.methods({


  sendResetEmail(user_id : string) {
    Accounts.sendResetPasswordEmail(user_id);
  },

  saveUser(user: Meteor.User, new_secret : string) {
    const syncUpdate = Meteor.wrapAsync(Meteor.users.update, Meteor.users);

    try {
      syncUpdate(user._id, {$set: user}, {upsert: true});
    }
    catch (e) {
      if (e.code == 11000) {
        throw new Meteor.Error('users.dup_key', e, 'der Wert wird bereits verwendet');
      } else {
        console.log('re-thrown error: ', e);
        throw e;
      }
    }

    if (new_secret === undefined || new_secret == '') return;
    // Set a new 4-word-secret:

    // fetches the (possibly) newly generated user id.
    const id = Accounts.findUserByEmail(user.emails[0].address)._id;

    const chunks = new_secret.trim().split(' ');
    if (chunks.length != 4) throw new Meteor.Error('users.invalid_secret', '', 'Gib vier Wörter an, getrennt durch Leerschläge');

    const [new_first_word, ...secret_words] = chunks;
    Accounts.setUsername(id, new_first_word);
    Accounts.setPassword(id, secret_words.join('-'));
  },

  saveSong(remoteObject: Partial<Song>) {
    //  Attach helpers
    const song : Song = new Song(remoteObject);

    // Parse server-side
    song.parse(song.text);

    check(song.title, String);
    check(song.title_, String);
    check(song.author, String);
    check(song.author_, String);
    check(song.tags, Array);
    check(song.text, String);

    delete song.revision_cache;  // aka. transient field!

    // Check for modifications
    const storedSong = Songs.findOne(song._id);
    if (storedSong != undefined && storedSong.text == song.text) {
      // Content has not changed. 
      if (storedSong?.parsed_rmd_version != rmd_version) {
        Songs.update(song._id, song);
      }
      return true; // early return, don't create revision
    } 

    const user_id = Meteor.userId();
    song.last_editor = user_id;

    // Save Song
    if ('_id' in song) {
      if (song.isEmpty()) {
        Songs.remove(song._id);

        return false; // early return, don't create revision
      } 
      else {
        Songs.update(song._id, song);
      }
    } 
    else {
      song._id = Songs.insert(song);
    }


    // Create Revision
    const rev = {
      timestamp: new Date(),
      ip: this.connection.clientAddress,
      of: song._id,
      text: song.text,
      editor: user_id
    };

    Revisions.insert(rev);
    return true;
  }

});

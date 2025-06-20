# Overview

The app is a simple book club app that offers features for a small (5-20 members) book club.

The users can suggest books for reading, and vote for other suggestions.

This happens in three phases: suggesting, voting and result showing.

The admin user has only one privilege on top of regular feats: they can launch a new voting phase. That means they define two date-times: suggestion deadline and voting deadline. Suggestion deadline means that the suggestions will have to be given before that. After that deadline, the app will automatically move into voting phase, where users can give votes. After the voting deadline, it will show the results.

### Auth

The app should have a simple auth.
Token based login: server creates jwt-token on login, that expires in 12 hours.
User is either admin or non-admin.

### Book suggestions

Users can suggest books through a form. Each user can only suggest 1 book at a time.

The form has required fields:

- Title
- Author

And optional fields:

- Year
- Page number
- Link
- Misc info

### Book voting

Users see all suggestions in a table with all the info. They can select the desired books, as many as they like, and then click Vote to submit their votes. They can then click vote to send to votes to server. After this the page will always show which books they currently have selected, and the user can change those before the voting deadline.

### Results

The results display will show how many votes each book receive, ordered by votes. It will not be shown, even to admin, which user voted for which book.

# Ideas for changes or future developments

- Rank voting?
- Include book rating / feedback phase. At the end of a year, all read books can be summarized and ranked.

- [EPIC] Support for multiple separate book clubs
  - (super)admin role that can see or delete book clubs
  - manager role which is the admin of a single book club

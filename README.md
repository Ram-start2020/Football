
# Soccer Team Balancer

The Soccer Team Balancer is a web application designed for organizing casual soccer games. It allows users to manage a roster of players, automatically generate balanced teams based on player ratings and preferred positions, track match scores, and persist player statistics over time. The application is built with React, TypeScript, and Tailwind CSS, and it uses Supabase for its backend database.

## ✨ Key Features

- **👤 Player Roster Management**: Full CRUD (Create, Read, Update, Delete) functionality for the player roster.
- **📊 Detailed Player Stats**: Tracks wins, losses, goals, and assists for each player, which are saved after every game day.
- **🤖 Automated Team Generation**: A sophisticated algorithm creates balanced teams by considering:
    - **Player Ratings**: Aims to make the average team ratings as close as possible.
    - **Positional Needs**: Ensures each team has the required number of defenders, midfielders, and forwards.
    - **Player Versatility**: Prioritizes filling scarcer positions first and uses player versatility to its advantage.
- **✍️ Manual Team Editing**: Full flexibility to manually create or adjust the automatically generated teams via a drag-and-drop-like interface.
- **⚽ Game Day & Match Tracking**:
    - Confirm generated teams to lock them in for a game day.
    - Add multiple matches between the confirmed teams.
    - Log goals and assists for each match in real-time.
- **💾 Data Persistence**: All player data and stats are stored in a Supabase database, so your roster is always saved.
- **📱 Responsive Design**: A clean, modern UI that works seamlessly on desktop and mobile devices.

## 🚀 Getting Started

To run this application locally, you'll need to set up a free Supabase project to handle the database.

### Prerequisites

- A [Supabase](https://supabase.com/) account.
- A modern web browser.

### Setup Instructions

1.  **Clone the Repository**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Set Up Supabase**
    a. Go to your [Supabase Dashboard](https://app.supabase.com) and click **"New project"**.
    b. Enter a project name and generate a secure database password.
    c. After the project is created, navigate to the **SQL Editor** from the left sidebar.
    d. Click **"+ New query"** and paste the following SQL to create the `players` table. Then click **"RUN"**.

    ```sql
    -- Create the players table
    CREATE TABLE public.players (
      id uuid NOT NULL DEFAULT gen_random_uuid(),
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      name text NOT NULL,
      rating smallint NOT NULL,
      positions text[] NOT NULL,
      wins integer NOT NULL DEFAULT 0,
      losses integer NOT NULL DEFAULT 0,
      goals integer NOT NULL DEFAULT 0,
      assists integer NOT NULL DEFAULT 0,
      CONSTRAINT players_pkey PRIMARY KEY (id),
      CONSTRAINT players_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
    );

    -- Optional: Add comments for clarity in the Supabase UI
    COMMENT ON TABLE public.players IS 'Stores information about each soccer player.';
    ```

    e. Navigate to **Project Settings > API**.
    f. Find your **Project URL** and **Project API Keys** (use the `anon` `public` key).

3.  **Configure the Application**
    a. In the project's root directory, open the `config.ts` file.
    b. Replace the placeholder values for `SUPABASE_URL` and `SUPABASE_ANON_KEY` with the credentials from your Supabase project.

    ```typescript
    // in config.ts
    export const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // Paste your Project URL here
    export const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Paste your anon public key here
    ```

4.  **Run the Application**
    Since this is a simple frontend project without a build step, you can run it by opening the `index.html` file in your web browser. For the best experience, use a simple local server extension like VS Code's "Live Server".

    Upon first launch with a correctly configured but empty database, the application will automatically seed the roster with a set of initial players.

## 📖 How to Use the App

The application flow is designed to be intuitive, guiding you from roster management to finalizing a game day.

1.  **Manage the Player Roster**
    - The main screen displays the **Player Roster**.
    - Click **"Add New Player"** to open a modal where you can enter a player's name, rating (1-5), and one or more positions.
    - Use the **Edit** and **Delete** buttons on each player row to manage your roster.

2.  **Select Players for the Draft**
    - Before generating teams, you must select which players are participating. Use the checkboxes in the **"Draft?"** column.
    - A counter shows how many players you have selected out of the total required (`18` by default for 3 teams of 6).

3.  **Generate or Manually Create Teams**
    - Once the exact number of players are drafted, the **"Generate Teams"** and **"Manual Edit Teams"** buttons become active.
    - **Generate Teams**: Click this to have the algorithm create balanced teams. You can review the proposed teams, see their average rating, and view the formation. If you're not satisfied, you can **Regenerate** or **Edit Proposed Teams**.
    - **Manual Edit Teams**: This opens a modal where you can assign each drafted player to a specific team and slot.

4.  **Confirm Teams**
    - Once you are happy with the teams, click **"Confirm Teams"**. This locks the teams and moves you to the match-tracking phase.

5.  **Track Matches**
    - Click **"Add New Match"** to set up a game between two of the confirmed teams.
    - For each match, you can log goals by clicking the **"Add Goal for..."** button. In the form that appears, you can select the scorer and an optional assister. "Own goals" are also supported.
    - Mistakes can be corrected by clicking the `×` button next to a logged goal event.

6.  **Finalize the Game Day**
    - After all matches are complete and scores are logged, click **"Finalize Game Day"**.
    - This action calculates the results, updates the `wins`, `losses`, `goals`, and `assists` stats for every player involved, and saves the changes to the database.

7.  **Start a New Game Day**
    - To start over, click **"Clear & New Game Day"**. This will reset the teams and matches, allowing you to draft players for a new session. Your player roster and their updated stats remain intact.

## 🔧 Configuration

The application's core game rules can be modified in `constants.ts`:

- `TEAM_SIZE`: Number of players per team.
- `NUM_TEAMS`: Total number of teams to be formed.
- `TEAM_NAMES`: An array of names for the teams.
- `POSITIONS_PER_TEAM`: An object defining the required number of players for each position on a single team.

Changing these constants will automatically update the UI and the team generation logic.

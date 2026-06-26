CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles (extends auth.users 1:1)
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT UNIQUE NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Projects (albums)
CREATE TABLE public.projects (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  description  TEXT,
  cover_url    TEXT,
  owner_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_owner ON public.projects(owner_id);

CREATE TYPE public.member_role AS ENUM ('owner', 'contributor', 'viewer');

CREATE TABLE public.project_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        public.member_role NOT NULL DEFAULT 'viewer',
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_members_project ON public.project_members(project_id);
CREATE INDEX idx_project_members_user    ON public.project_members(user_id);

-- Tracks (songs within a project)
CREATE TABLE public.tracks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  position    INTEGER NOT NULL DEFAULT 0,
  created_by  UUID NOT NULL REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tracks_project ON public.tracks(project_id);

-- Versions (each upload of a track)
CREATE TABLE public.versions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  track_id       UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  audio_key      TEXT NOT NULL,
  file_name      TEXT NOT NULL,
  file_size      BIGINT,
  duration       INTEGER,
  description    TEXT,
  tags           TEXT[] NOT NULL DEFAULT '{}',
  uploaded_by    UUID NOT NULL REFERENCES public.profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(track_id, version_number)
);

CREATE INDEX idx_versions_track ON public.versions(track_id);

-- Comments (on versions, threaded)
CREATE TABLE public.comments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_id   UUID NOT NULL REFERENCES public.versions(id) ON DELETE CASCADE,
  parent_id    UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  author_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body         TEXT NOT NULL,
  timestamp_s  REAL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_version ON public.comments(version_id);
CREATE INDEX idx_comments_parent  ON public.comments(parent_id);

CREATE TYPE public.task_status AS ENUM ('open', 'in_progress', 'done');

CREATE TABLE public.tasks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_id    UUID NOT NULL REFERENCES public.versions(id) ON DELETE CASCADE,
  project_id    UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  body          TEXT,
  status        public.task_status NOT NULL DEFAULT 'open',
  assignee_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by    UUID NOT NULL REFERENCES public.profiles(id),
  due_date      DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_version  ON public.tasks(version_id);
CREATE INDEX idx_tasks_project  ON public.tasks(project_id);
CREATE INDEX idx_tasks_assignee ON public.tasks(assignee_id);

-- Triggers: auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at  BEFORE UPDATE ON public.profiles  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_projects_updated_at  BEFORE UPDATE ON public.projects  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tracks_updated_at    BEFORE UPDATE ON public.tracks    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_comments_updated_at  BEFORE UPDATE ON public.comments  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tasks_updated_at     BEFORE UPDATE ON public.tasks     FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger: auto-increment version_number per track
CREATE OR REPLACE FUNCTION public.set_version_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
    INTO NEW.version_number
    FROM public.versions
   WHERE track_id = NEW.track_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_versions_version_number
  BEFORE INSERT ON public.versions
  FOR EACH ROW EXECUTE FUNCTION public.set_version_number();

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: auto-add owner as project member
CREATE OR REPLACE FUNCTION public.handle_new_project()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_project_created
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_project();

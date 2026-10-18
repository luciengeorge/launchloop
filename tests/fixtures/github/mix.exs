defmodule Pulse.MixProject do
  use Mix.Project

  # Trimmed from plausible/analytics: an Elixir/Phoenix app with no root package.json.
  def project do
    [
      app: :pulse,
      version: "0.0.1",
      elixir: "~> 1.18",
      deps: deps()
    ]
  end

  defp deps do
    [
      {:bamboo, "~> 2.3", override: true},
      {:credo, "~> 1.7", only: [:dev, :test], runtime: false},
      {:ecto_ch, "~> 0.11"},
      {:ecto, "~> 3.14"},
      {:ecto_sql, "~> 3.14"},
      {:oban, "~> 2.24.1"},
      {:opentelemetry_phoenix, "~> 2.0.1"},
      {:phoenix, "~> 1.8.2"},
      {:phoenix_view, "~> 2.0"},
      {:phoenix_ecto, "~> 4.5"},
      {:phoenix_live_view, "~> 1.1.17"},
      {:postgrex, "~> 0.22.2"},
      {:esbuild, "~> 0.7", runtime: Mix.env() in [:dev, :ce_dev]},
      {:tailwind, "~> 0.4.0", runtime: Mix.env() in [:dev, :ce_dev]}
    ]
  end
end

FROM oven/bun:alpine

# Config Bun
ENV PATH="~/.bun/bin:${PATH}"
RUN ln -s /usr/local/bin/bun /usr/local/bin/node

RUN apk update && apk add zsh git curl

# Install and setup Oh My Zsh
RUN sh -c "$(wget https://raw.github.com/robbyrussell/oh-my-zsh/master/tools/install.sh -O -)"
RUN sed -i -e "s/bin\/ash/bin\/zsh/" /etc/passwd

RUN git config --global --add safe.directory /workspaces/configuration
